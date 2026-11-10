import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

type EtoEnvelope = {
  binding: string
  op: string
  callId?: string
  methodName?: string
  requestId?: string
  args?: string
  otelTraceContext?: string
  url?: string
}

type SpeckleEto = { resolve: (callId: string, value: string) => boolean }

const SECOND = 1000
const TRACE_CONTEXT = JSON.stringify({
  traceparent: '00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01'
})

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

/** Lets the bridge post its next message: GenericBridge only probes capabilities once the method names are in. */
const flush = () => vi.advanceTimersByTimeAsync(0)

/**
 * Drives `GenericBridge.create()` against the fake host: answers the method-name call and then
 * the capability probe, which is what an Eto host that supports traced calls does.
 */
const createGenericBridge = async (host: ReturnType<typeof fakeEtoHost>) => {
  const { EtoRawBridge } = await importEto()
  const { GenericBridge } = await import('~/lib/bridge/generic')
  const bridge = new GenericBridge(
    new EtoRawBridge('accountsBinding'),
    'accountsBinding'
  )

  const created = bridge.create()
  host.resolve(host.lastCall().callId!, JSON.stringify(['GetAccounts']))
  await flush()
  expect(host.lastCall()).toMatchObject({
    binding: 'accountsBinding',
    op: 'GetBridgeCapabilities'
  })
  host.resolve(host.lastCall().callId!, JSON.stringify(['otelTraceContext']))
  await expect(created).resolves.toBe(true)

  return bridge as unknown as {
    getAccounts: () => Promise<unknown>
    responseReady: (id: string) => Promise<void>
  }
}

describe('Eto (Rhino 8 Mac) bridge', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.useFakeTimers()
    vi.stubGlobal('window', globalThis)
  })

  afterEach(() => {
    vi.doUnmock('~/lib/core/utils/otelTrace')
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

  it('runs a binding method through GenericBridge: RunMethodTraced, responseReady, GetCallResult', async () => {
    const host = fakeEtoHost()
    const bridge = await createGenericBridge(host)

    const accounts = bridge.getAccounts()
    const run = host.lastCall()
    expect(run).toMatchObject({
      binding: 'accountsBinding',
      op: 'RunMethodTraced',
      methodName: 'GetAccounts',
      args: '[]'
    })
    // No tracer is registered here, so there is no span: the host gets the traced op with a null context.
    expect(run.otelTraceContext).toBeUndefined()

    const ready = bridge.responseReady(run.requestId!)
    const fetch = host.lastCall()
    expect(fetch).toMatchObject({ op: 'GetCallResult', requestId: run.requestId })
    host.resolve(fetch.callId!, JSON.stringify([{ id: 'acc-1' }]))
    await ready

    await expect(accounts).resolves.toEqual([{ id: 'acc-1' }])
  })

  it('propagates the trace context of an active span through RunMethodTraced', async () => {
    vi.doMock('~/lib/core/utils/otelTrace', () => ({
      startBridgeSpan: () => ({ spanContext: () => ({}) }),
      serializeTraceContext: () => TRACE_CONTEXT,
      failBridgeSpan: () => undefined,
      endBridgeSpan: () => undefined
    }))
    const host = fakeEtoHost()
    const bridge = await createGenericBridge(host)

    void bridge.getAccounts()
    expect(host.lastCall()).toMatchObject({
      op: 'RunMethodTraced',
      methodName: 'GetAccounts',
      otelTraceContext: TRACE_CONTEXT
    })
  })

  it('never posts the legacy RunMethod op', async () => {
    const host = fakeEtoHost()
    const { EtoRawBridge } = await importEto()
    const bridge = new EtoRawBridge('accountsBinding')

    await bridge.RunMethod('GetAccounts', 'r1', '[]')
    expect(host.lastCall()).toMatchObject({
      op: 'RunMethodTraced',
      methodName: 'GetAccounts',
      requestId: 'r1',
      args: '[]'
    })
    expect(host.lastCall().otelTraceContext).toBeUndefined()

    await bridge.RunMethodTraced('GetAccounts', 'r2', '[]', TRACE_CONTEXT)
    expect(host.lastCall()).toMatchObject({
      op: 'RunMethodTraced',
      requestId: 'r2',
      otelTraceContext: TRACE_CONTEXT
    })

    expect(host.posted.map((m) => m.op)).not.toContain('RunMethod')
  })

  it('rejects the capability probe when the host does not advertise trace context', async () => {
    const host = fakeEtoHost()
    const { EtoRawBridge } = await importEto()
    const bridge = new EtoRawBridge('accountsBinding')

    const capabilities = bridge.GetBridgeCapabilities()
    host.resolve(host.lastCall().callId!, JSON.stringify([]))

    await expect(capabilities).rejects.toThrow(
      "The Eto host for accountsBinding does not advertise 'otelTraceContext'"
    )
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
