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

declare let globalThis: Record<string, unknown> & {
  eto?: { postMessage: (message: string) => void }
  webkit?: {
    messageHandlers?: { __eto__?: { postMessage: (message: string) => void } }
  }
}

/**
 * Eto wraps its WKScriptMessageHandler as `window.eto.postMessage` via a user script whose injection can land after
 * Nuxt's plugins have run; the raw handler `window.webkit.messageHandlers.__eto__` is registered on the WebView
 * configuration before any navigation, so it is the reliable target.
 */
const etoHandler = () =>
  globalThis.eto?.postMessage
    ? globalThis.eto
    : globalThis.webkit?.messageHandlers?.__eto__ ?? null

const pending = new Map<string, (value: string) => void>()
let seq = 0

/** Called by .NET: `window.__speckleEto.resolve('<callId>', '<json string>')`. */
;(globalThis as Record<string, unknown>)['__speckleEto'] = {
  resolve: (callId: string, value: string) => {
    const resolver = pending.get(callId)
    if (!resolver) return
    pending.delete(callId)
    resolver(value)
  }
}

/**
 * IRawBridge over Eto WebView script messages. Same contract as the WebView2/CefSharp host objects,
 * so it plugs into GenericBridge unchanged.
 */
export class EtoRawBridge implements IRawBridge {
  constructor(private readonly binding: string) {}

  private post(message: Omit<EtoMessage, 'binding'>) {
    etoHandler()!.postMessage(JSON.stringify({ binding: this.binding, ...message }))
  }

  private call(message: Omit<EtoMessage, 'binding' | 'callId'>): Promise<string> {
    const callId = `${this.binding}_${++seq}`
    return new Promise<string>((resolve) => {
      pending.set(callId, resolve)
      this.post({ ...message, callId })
    })
  }

  async GetBindingsMethodNames(): Promise<string[]> {
    const result = await this.call({ op: 'GetBindingsMethodNames' })
    // .NET answers an unknown binding with an empty payload; rejecting here lets GenericBridge.create() report
    // "Failed to bind" exactly as it does when a WebView2 host object is missing.
    if (result === '') throw new Error(`No ${this.binding} binding on the .NET side`)
    return JSON.parse(result) as string[]
  }

  RunMethod(methodName: string, requestId: string, args: string): Promise<string> {
    this.post({ op: 'RunMethod', methodName, requestId, args })
    return Promise.resolve('')
  }

  GetCallResult(requestId: string): Promise<string> {
    return this.call({ op: 'GetCallResult', requestId })
  }

  ShowDevTools(): Promise<void> {
    this.post({ op: 'ShowDevTools' })
    return Promise.resolve()
  }

  OpenUrl(url: string): Promise<void> {
    this.post({ op: 'OpenUrl', url })
    return Promise.resolve()
  }
}

export const isEto = () => etoHandler() !== null
