import type { IRawBridge } from '~/lib/bridge/definitions'

/**
 * Message envelope posted to .NET through Eto's `window.eto.postMessage` (Rhino 8 Mac, WKWebView).
 * Eto has no host-object injection, so every IRawBridge call becomes a one-way message; calls that
 * return a value carry a `callId` that .NET answers via `window.__speckleEto.resolve(callId, json)`.
 */
type EtoMessage = {
  binding: string
  op:
    | 'GetBindingsMethodNames'
    | 'RunMethod'
    | 'GetCallResult'
    | 'ShowDevTools'
    | 'OpenUrl'
  callId?: string
  methodName?: string
  requestId?: string
  args?: string
  url?: string
}

type EtoPostTarget = { postMessage: (message: string) => void }

declare let globalThis: Record<string, unknown> & {
  eto?: EtoPostTarget
  webkit?: {
    messageHandlers?: { __eto__?: EtoPostTarget }
  }
  __speckleEto?: { resolve: (callId: string, value: string) => boolean }
}

/**
 * Bindings are probed in sequence by the Nuxt bindings plugin before the app mounts, so an
 * unanswered call must fail fast or the whole UI stays blank (FEA-124).
 */
const DEFAULT_CALL_TIMEOUT_MS = 5_000
/**
 * GetCallResult is only sent after the host signalled `responseReady`, but the payload can be large;
 * GenericBridge still bounds the overall method call at 60s.
 */
const CALL_RESULT_TIMEOUT_MS = 30_000

/**
 * `window.eto.postMessage` is Eto's user-script wrapper around the raw `__eto__` WKScriptMessageHandler
 * (picoe/Eto WKWebViewHandler); both raise the same MessageReceived on .NET, so either one identifies an Eto host.
 */
const etoHandler = (): EtoPostTarget | null =>
  globalThis.eto?.postMessage
    ? globalThis.eto
    : globalThis.webkit?.messageHandlers?.__eto__ ?? null

export const isEto = () => etoHandler() !== null

type PendingCall = {
  resolve: (value: string) => void
  reject: (reason: Error) => void
  timerId: ReturnType<typeof setTimeout>
}

const pending = new Map<string, PendingCall>()
let seq = 0

/** Only Eto hosts get the `window.__speckleEto` global that .NET answers through. */
const installResolver = () => {
  if (globalThis.__speckleEto || !isEto()) return
  globalThis.__speckleEto = {
    resolve: (callId: string, value: string) => {
      const call = pending.get(callId)
      if (!call) return false
      pending.delete(callId)
      clearTimeout(call.timerId)
      call.resolve(value)
      return true
    }
  }
}

/**
 * IRawBridge over Eto WebView script messages. Same contract as the WebView2/CefSharp host objects,
 * so it plugs into GenericBridge unchanged.
 */
export class EtoRawBridge implements IRawBridge {
  constructor(private readonly binding: string) {
    installResolver()
  }

  private post(message: Omit<EtoMessage, 'binding'>) {
    const handler = etoHandler()
    if (!handler)
      throw new Error(
        `Cannot reach the Eto host for ${this.binding}: neither window.eto.postMessage nor window.webkit.messageHandlers.__eto__ is available.`
      )
    handler.postMessage(JSON.stringify({ binding: this.binding, ...message }))
  }

  private call(
    message: Omit<EtoMessage, 'binding' | 'callId'>,
    timeoutMs = DEFAULT_CALL_TIMEOUT_MS
  ): Promise<string> {
    const callId = `${this.binding}_${++seq}`
    return new Promise<string>((resolve, reject) => {
      const timerId = setTimeout(() => {
        pending.delete(callId)
        reject(
          new Error(
            `Eto host did not answer ${message.op} for ${this.binding} within ${timeoutMs}ms.`
          )
        )
      }, timeoutMs)
      pending.set(callId, { resolve, reject, timerId })
      try {
        this.post({ ...message, callId })
      } catch (error) {
        clearTimeout(timerId)
        pending.delete(callId)
        reject(error as Error)
      }
    })
  }

  async GetBindingsMethodNames(): Promise<string[]> {
    const result = await this.call({ op: 'GetBindingsMethodNames' })
    // .NET answers an unknown binding with an empty payload; rejecting here lets GenericBridge.create() report
    // "Failed to bind" exactly as it does when a WebView2 host object is missing.
    if (result === '') throw new Error(`No ${this.binding} binding on the .NET side`)
    return JSON.parse(result) as string[]
  }

  // Fire-and-forget posts reject rather than throw, so GenericBridge's host-rejection handling
  // settles the request immediately instead of waiting out its 60s timeout.
  private send(message: Omit<EtoMessage, 'binding' | 'callId'>): Promise<void> {
    return new Promise<void>((resolve) => {
      this.post(message)
      resolve()
    })
  }

  async RunMethod(
    methodName: string,
    requestId: string,
    args: string
  ): Promise<string> {
    await this.send({ op: 'RunMethod', methodName, requestId, args })
    return ''
  }

  GetCallResult(requestId: string): Promise<string> {
    return this.call({ op: 'GetCallResult', requestId }, CALL_RESULT_TIMEOUT_MS)
  }

  ShowDevTools(): Promise<void> {
    return this.send({ op: 'ShowDevTools' })
  }

  OpenUrl(url: string): Promise<void> {
    return this.send({ op: 'OpenUrl', url })
  }
}
