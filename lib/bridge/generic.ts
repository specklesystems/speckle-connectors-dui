import { ArchicadBridge } from '~/lib/bridge/server'
import { BaseBridge } from '~/lib/bridge/base'
import type { IRawBridge } from '~/lib/bridge/definitions'
import type { Span } from '@opentelemetry/api'
import {
  endBridgeSpan,
  failBridgeSpan,
  serializeTraceContext,
  startBridgeSpan
} from '~/lib/core/utils/otelTrace'

const OTEL_TRACE_CONTEXT_CAPABILITY = 'otelTraceContext'
const CAPABILITY_PROBE_TIMEOUT_MS = 750

/**
 * Capabilities belong to the connector process, not to a binding: every binding's
 * bridge is the same host class. Probed once and shared across all ~11 bindings.
 */
let hostCapabilities: Promise<Set<string>> | undefined

const TIMED_OUT = Symbol('timed out')

const probeHostCapabilities = async (bridge: IRawBridge): Promise<Set<string>> => {
  try {
    // CefSharp and Archicad expose missing members as undefined, so this costs
    // nothing there. WebView2 hands back a callable proxy regardless, so the only
    // way to know is to call and catch the rejection.
    if (typeof bridge.GetBridgeCapabilities !== 'function') {
      console.log('[bridge] host advertises no capabilities')
      return new Set()
    }

    const advertised = await Promise.race([
      bridge.GetBridgeCapabilities(),
      new Promise<typeof TIMED_OUT>((resolve) =>
        window.setTimeout(() => resolve(TIMED_OUT), CAPABILITY_PROBE_TIMEOUT_MS)
      )
    ])

    if (advertised === TIMED_OUT) {
      console.log(
        `[bridge] capability probe timed out after ${CAPABILITY_PROBE_TIMEOUT_MS}ms`
      )
      return new Set()
    }

    // Array.from takes iterables and array-likes alike: host arrays arrive marshalled
    // and are not necessarily real JS arrays.
    const capabilities = new Set(Array.from<unknown, string>(advertised, String))
    console.log('[bridge] host capabilities', [...capabilities])
    return capabilities
  } catch (error) {
    console.log('[bridge] capability probe failed', error)
    return new Set()
  }
}

/**
 * A generic bridge class for Webivew2 or CefSharp.
 */
export class GenericBridge extends BaseBridge {
  private bridge: IRawBridge
  private bindingName: string
  private archicadBridge: ArchicadBridge | undefined
  private supportsTraceContext = false
  private requests = {} as Record<
    string,
    {
      methodName: string
      resolve: (value: unknown) => void
      reject: (reason: string | Error) => void
      rejectTimerId: number
      span?: Span
    }
  >
  // TOTHINK: as this is a fast timeout, it forces us for long await methods in .net to return results via events. Kind-of not cool, and i'd be in favour of bumping it to "endless", or remove it altogether
  // An example is the send or receive operations: they can take fucking long :D
  private TIMEOUT_MS = 1000 * 60 // 60 sec

  constructor(
    object: IRawBridge,
    bindingName: string,
    isArchicadBridge: boolean = false
  ) {
    super()
    this.bridge = object
    this.bindingName = bindingName
    if (isArchicadBridge) {
      this.archicadBridge = new ArchicadBridge(this.emitter)
    }
  }

  public async create(): Promise<boolean> {
    // NOTE: GetMethods is a call to the .NET side.

    try {
      this.availableMethodNames = await this.bridge.GetBindingsMethodNames()
    } catch (error) {
      console.warn(`Failed to get method names from binding.`, error)
      return false
    }

    // Deliberately after the block above: a failed probe must never take the
    // binding down.
    hostCapabilities ??= probeHostCapabilities(this.bridge)
    this.supportsTraceContext = (await hostCapabilities).has(
      OTEL_TRACE_CONTEXT_CAPABILITY
    )

    // NOTE: hoisting original calls as lowerCasedMethodNames, but using the UpperCasedName for the .NET call
    // This allows us to follow js convetions and keep .NET ones too (eg. bindings.sayHi('') => public string SayHi(string name) {}
    for (const methodName of this.availableMethodNames) {
      const lowercasedMethodName = lowercaseMethodName(methodName)
      const hoistTarget = this as unknown as Record<string, object>
      hoistTarget[lowercasedMethodName] = (...args: unknown[]) =>
        this.runMethod(methodName, args)
    }

    return true
  }

  private async emitResponseReady(eventName: string, requestId: string) {
    this.registerPromise(eventName, requestId)
    const data = await this.bridge.GetCallResult(requestId)
    const request = this.requests[requestId]
    try {
      const parsedData = data ? (JSON.parse(data) as Record<string, unknown>) : null

      if (parsedData === null) {
        throw new Error(`Data is not parsed successfuly on ${eventName}`)
      }

      if (this.archicadBridge) {
        this.archicadBridge.emit(eventName, parsedData, this.runMethod.bind(this))
      } else {
        this.emitter.emit(eventName, parsedData)
      }

      request.resolve(parsedData)
    } catch (e) {
      console.error(e)
      request.reject(e as Error)
    } finally {
      endBridgeSpan(request.span)
      window.clearTimeout(request.rejectTimerId)
      delete this.requests[requestId]
    }
  }

  async runMethod(
    methodName: string,
    args: unknown[],
    shouldTimeout: boolean = true
  ): Promise<unknown> {
    const requestId = (Math.random() + 1).toString(36).substring(2) + '_' + methodName
    const preserializedArgs = args.map((a) => JSON.stringify(a))
    const argsJson = JSON.stringify(preserializedArgs)

    const span = this.supportsTraceContext
      ? startBridgeSpan(this.bindingName, methodName, requestId)
      : undefined
    const traceContext = serializeTraceContext(span)

    const call =
      traceContext && this.bridge.RunMethodTraced
        ? this.bridge.RunMethodTraced(methodName, requestId, argsJson, traceContext)
        : this.bridge.RunMethod(methodName, requestId, argsJson)

    // Without this a host-side rejection is an unhandled rejection followed by a
    // silent 60s wait for a timeout that names the binding method, not the bridge.
    void Promise.resolve(call).catch((error: unknown) => {
      console.error(`Bridge call to ${methodName} was rejected by the host.`, error)
      this.settleWithError(requestId, error)
    })

    return this.registerPromise(methodName, requestId, shouldTimeout, span)
  }

  private settleWithError(requestId: string, error: unknown) {
    const request = this.requests[requestId]
    if (!request) return

    failBridgeSpan(request.span, error)
    endBridgeSpan(request.span)
    window.clearTimeout(request.rejectTimerId)
    delete this.requests[requestId]
    request.reject(error instanceof Error ? error : new Error(String(error)))
  }

  private async registerPromise(
    methodName: string,
    requestId: string,
    shouldTimeout: boolean = true,
    span?: Span
  ) {
    return new Promise((resolve, reject) => {
      this.requests[requestId] = {
        methodName,
        resolve,
        reject,
        span,
        rejectTimerId: window.setTimeout(
          () => {
            const message = `.NET response timed out for call to ${methodName} - did not receive anything back in good time (${this.TIMEOUT_MS}ms).`
            failBridgeSpan(span, new Error(message))
            endBridgeSpan(span)
            reject(message)
            delete this.requests[requestId]
          },
          shouldTimeout ? this.TIMEOUT_MS : 3600000
        )
      }
    })
  }

  private async responseReady(requestId: string) {
    if (!this.requests[requestId])
      throw new Error(
        `.NET Bridge found no request to resolve with the id of ${requestId}. Something is weird!`
      )

    const request = this.requests[requestId]
    const data = await this.bridge.GetCallResult(requestId)
    try {
      const parsedData = data ? (JSON.parse(data) as Record<string, unknown>) : null // TODO: check if data is undefined

      // eslint-disable-next-line no-prototype-builtins
      if (parsedData && parsedData.hasOwnProperty('error')) {
        console.error(data)
        this.emitter.emit('errorOnResponse', data)
        throw new Error(
          `Failed to run ${requestId}. The host app error is logged above.`
        )
      }
      request.resolve(parsedData)
    } catch (e) {
      console.error(e)
      failBridgeSpan(request.span, e)
      request.reject(e as Error)
    } finally {
      endBridgeSpan(request.span)
      window.clearTimeout(request.rejectTimerId)
      delete this.requests[requestId]
    }
  }

  public showDevTools() {
    this.bridge.ShowDevTools()
  }

  public openUrl(url: string) {
    this.bridge.OpenUrl(url)
  }
}

const lowercaseMethodName = (name: string) =>
  name.charAt(0).toLowerCase() + name.slice(1)
