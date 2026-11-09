import type { IRawBridge } from '~/lib/bridge/definitions'

/**
 * Eto has no host-object injection, so every IRawBridge call becomes a one-way message; calls that
 * return a value carry a `callId` that .NET answers via `window.__speckleEto.resolve(callId, json)` (FEA-124).
 */
type EtoMessage = {
  binding: string
  op:
    | 'GetBindingsMethodNames'
    | 'GetBridgeCapabilities'
    | 'RunMethod'
    | 'RunMethodTraced'
    | 'GetCallResult'
    | 'ShowDevTools'
    | 'OpenUrl'
  callId?: string
  methodName?: string
  requestId?: string
  args?: string
  otelTraceContext?: string
  url?: string
}

type EtoRequest = Omit<EtoMessage, 'binding' | 'callId'>

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
/** GetCallResult is only sent after the host signalled `responseReady`, but a send/receive result can be large (FEA-124). */
const CALL_RESULT_TIMEOUT_MS = 30_000

/** Either Eto entry point identifies the host: `window.eto` is a user-script wrapper around the raw `__eto__` handler (FEA-124). */
const etoHandler = (): EtoPostTarget | null =>
  globalThis.eto?.postMessage
    ? globalThis.eto
    : globalThis.webkit?.messageHandlers?.__eto__ ?? null

export const isEto = () => etoHandler() !== null

type PendingCall = {
  resolve: (value: string) => void
  timerId: ReturnType<typeof setTimeout>
}

const pending = new Map<string, PendingCall>()
let callSeq = 0

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
    message: EtoRequest,
    timeoutMs = DEFAULT_CALL_TIMEOUT_MS
  ): Promise<string> {
    const callId = `${this.binding}_${++callSeq}`
    return new Promise<string>((resolve, reject) => {
      const timerId = setTimeout(() => {
        pending.delete(callId)
        reject(
          new Error(
            `Eto host did not answer ${message.op} for ${this.binding} within ${timeoutMs}ms.`
          )
        )
      }, timeoutMs)
      pending.set(callId, { resolve, timerId })
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
    // The host answers an unknown binding with an empty payload; rejecting marks the binding absent (FEA-124).
    if (result === '') throw new Error(`No ${this.binding} binding on the .NET side`)
    return JSON.parse(result) as string[]
  }

  // Reject rather than throw so a dead host fails the request at once instead of on the bridge timeout (FEA-124).
  private send(message: EtoRequest): Promise<void> {
    return new Promise<void>((resolve) => {
      this.post(message)
      resolve()
    })
  }

  // Never rejects: a host that predates the op answers "" or not at all, and GenericBridge's probe has already
  // moved on by then; a late rejection would surface as an unhandled one (FEA-124).
  async GetBridgeCapabilities(): Promise<string[]> {
    try {
      const result = await this.call({ op: 'GetBridgeCapabilities' })
      return result === '' ? [] : (JSON.parse(result) as string[])
    } catch {
      return []
    }
  }

  async RunMethodTraced(
    methodName: string,
    requestId: string,
    args: string,
    otelTraceContext: string
  ): Promise<string> {
    await this.send({
      op: 'RunMethodTraced',
      methodName,
      requestId,
      args,
      otelTraceContext
    })
    return ''
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
