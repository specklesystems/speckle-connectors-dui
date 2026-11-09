import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

type EtoEnvelope = {
  binding: string
  op: string
  callId?: string
  methodName?: string
  requestId?: string
  args?: string
  url?: string
}

type SpeckleEto = { resolve: (callId: string, value: string) => boolean }

const SECOND = 1000

/**
 * Stands in for Rhino 8 Mac's `DUI3EtoWebView`: Eto registers the raw WKScriptMessageHandler
 * `window.webkit.messageHandlers.__eto__`, and the DUI's messages arrive there as JSON strings.
 */
const fakeEtoHost = () => {
  const posted: EtoEnvelope[] = []
  vi.stubGlobal('webkit', {
    messageHandlers: {
      __eto__: {
        postMessage: (raw: string) => posted.push(JSON.parse(raw) as EtoEnvelope)
      }
    }
  })
  return {
    posted,
    lastCall: () => posted[posted.length - 1],
    resolve: (callId: string, value: string) =>
      (globalThis as unknown as { __speckleEto: SpeckleEto }).__speckleEto.resolve(
        callId,
        value
      )
  }
}

/** Fresh module state per test: the pending-call map and the installed resolver are module-level. */
const importEto = () => import('~/lib/bridge/eto')

describe('Eto (Rhino 8 Mac) bridge', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.useFakeTimers()
    vi.stubGlobal('window', globalThis)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    delete (globalThis as Record<string, unknown>).__speckleEto
  })

  it('resolves a call when the host answers through window.__speckleEto.resolve', async () => {
    const host = fakeEtoHost()
    const { EtoRawBridge } = await importEto()
    const bridge = new EtoRawBridge('accountsBinding')

    const methodNames = bridge.GetBindingsMethodNames()
    const call = host.lastCall()
    expect(call).toMatchObject({
      binding: 'accountsBinding',
      op: 'GetBindingsMethodNames'
    })
    expect(host.resolve(call.callId!, JSON.stringify(['GetAccounts']))).toBe(true)

    await expect(methodNames).resolves.toEqual(['GetAccounts'])
  })

  it('rejects a call the host never answers and forgets it', async () => {
    const host = fakeEtoHost()
    const { EtoRawBridge } = await importEto()
    const bridge = new EtoRawBridge('accountsBinding')

    const methodNames = bridge.GetBindingsMethodNames()
    const outcome = expect(methodNames).rejects.toThrow(
      'Eto host did not answer GetBindingsMethodNames for accountsBinding within 5000ms'
    )
    await vi.advanceTimersByTimeAsync(5 * SECOND)
    await outcome

    expect(host.resolve(host.lastCall().callId!, '[]')).toBe(false)
  })

  it('rejects GetBindingsMethodNames when the host has no such binding', async () => {
    const host = fakeEtoHost()
    const { EtoRawBridge } = await importEto()
    const bridge = new EtoRawBridge('nonExistantBindings')

    const methodNames = bridge.GetBindingsMethodNames()
    host.resolve(host.lastCall().callId!, '')

    await expect(methodNames).rejects.toThrow(
      'No nonExistantBindings binding on the .NET side'
    )
  })

  it('rejects instead of throwing when no Eto handler is reachable', async () => {
    const { EtoRawBridge } = await importEto()
    const bridge = new EtoRawBridge('accountsBinding')

    await expect(bridge.GetBindingsMethodNames()).rejects.toThrow(
      'Cannot reach the Eto host for accountsBinding'
    )
    await expect(bridge.RunMethod('GetAccounts', 'r1', '[]')).rejects.toThrow(
      'Cannot reach the Eto host'
    )
  })

  it('detects Eto from the raw __eto__ handler', async () => {
    fakeEtoHost()
    const { isEto } = await importEto()
    expect(isEto()).toBe(true)
  })

  it('does not detect Eto in plain WebKit, and installs no global there', async () => {
    vi.stubGlobal('webkit', { messageHandlers: {} })
    const { isEto, EtoRawBridge } = await importEto()
    new EtoRawBridge('accountsBinding')

    expect(isEto()).toBe(false)
    expect((globalThis as Record<string, unknown>).__speckleEto).toBeUndefined()
  })

  it('counts an Eto host as a connector', async () => {
    vi.stubGlobal('defineNuxtPlugin', (plugin: unknown) => plugin)
    const { isConnector } = await import('~/plugins/00.bindings')
    expect(isConnector()).toBe(false)

    fakeEtoHost()
    expect(isConnector()).toBe(true)
  })
})
