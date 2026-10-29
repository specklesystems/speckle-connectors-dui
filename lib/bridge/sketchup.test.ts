import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SketchupBridge } from '~/lib/bridge/sketchup'
import type {
  Account,
  IAccountBinding
} from '~/lib/bindings/definitions/IAccountBinding'

type ExecPayload = {
  name: string
  request_id: string
  binding_name: string
  data: { args: unknown[] }
}

type HostFacingBridge = {
  receiveCommandsAndInitializeBridge: (commandNamesJson: string) => void
  receiveResponse: (requestId: string, data: object) => void
}

const ACCOUNTS_BINDING_COMMANDS = [
  'getAccounts',
  'addAccount',
  'removeAccount',
  'authenticateAccount'
]

const SECOND = 1000
const MINUTE = 60 * SECOND

/**
 * Stands in for the SketchUp host the way `ui/dui3_dialog.rb` speaks to the DUI:
 * `getBindingsMethodNames` answers with the binding's command keys, and `exec`
 * queues a call whose answer the host later pushes through `receiveResponse`.
 */
const fakeSketchupHost = (commandNames: string[]) => {
  const execCalls: ExecPayload[] = []
  vi.stubGlobal('sketchup', {
    getBindingsMethodNames: () =>
      (
        globalThis as unknown as { bindings: HostFacingBridge }
      ).bindings.receiveCommandsAndInitializeBridge(JSON.stringify(commandNames)),
    exec: (payload: ExecPayload) => execCalls.push(payload)
  })
  return {
    lastRequestId: () => execCalls[execCalls.length - 1].request_id,
    respond: (bridge: SketchupBridge, requestId: string, data: object) =>
      (bridge as unknown as HostFacingBridge).receiveResponse(requestId, data)
  }
}

const accountsBinding = async () => {
  const host = fakeSketchupHost(ACCOUNTS_BINDING_COMMANDS)
  const bridge = new SketchupBridge('accountsBinding')
  await bridge.create()
  return { host, bridge, binding: bridge as unknown as IAccountBinding }
}

const savedAccount: Account = {
  id: '8D7C0F2B6E1A4C3D9B5E7F1A2C4D6E8F',
  isDefault: true,
  token: 'token-from-native-login',
  refreshToken: 'refresh-token-from-native-login',
  serverInfo: { name: 'Speckle', url: 'https://app.speckle.systems', frontend2: true },
  userInfo: {
    id: 'a1b2c3d4e5',
    avatar: '',
    email: 'ada@example.com',
    name: 'Ada Lovelace',
    commits: { totalCount: 0 },
    streams: { totalCount: 0 }
  }
}

describe('SketchUp accounts bridge', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.stubGlobal('window', globalThis)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('resolves a native login that SketchUp completes after 60 s with the saved account', async () => {
    const { host, bridge, binding } = await accountsBinding()

    const login = binding.authenticateAccount('https://app.speckle.systems')
    const requestId = host.lastRequestId()
    await vi.advanceTimersByTimeAsync(4 * MINUTE + 59 * SECOND)
    host.respond(bridge, requestId, savedAccount)

    await expect(login).resolves.toEqual(savedAccount)
  })

  it('still rejects other SketchUp account calls that get no answer within 60 s', async () => {
    const { binding } = await accountsBinding()

    const accounts = binding.getAccounts()
    const outcome = expect(accounts).rejects.toMatch(
      'Sketchup response timed out for getAccounts'
    )
    await vi.advanceTimersByTimeAsync(60 * SECOND)

    await outcome
  })
})
