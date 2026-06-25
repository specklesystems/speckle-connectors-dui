/* eslint-disable @typescript-eslint/require-await */
// Mock binding: async methods satisfy the Promise-returning interface
// signatures but have nothing to actually await.
import type {
  IBinding,
  IBindingSharedEvents
} from '~/lib/bindings/definitions/IBinding'

/**
 * The name under which this binding will be registered.
 */
export const IConfigBindingKey = 'configBinding'

/**
 * A test binding interface to ensure compatbility. Ideally all host environments would implement and register it.
 */
export interface IConfigBinding extends IBinding<IConfigBindingEvents> {
  getIsDevMode: () => Promise<boolean>
  getConfig: () => Promise<ConnectorConfig>
  getGlobalConfig: () => Promise<GlobalConfig>
  updateConfig: (config: ConnectorConfig) => void
  setUserSelectedAccountId: (accountId: string) => void
  getUserSelectedAccountId: () => Promise<AccountsConfig>
  getAccountsConfig: () => Promise<AccountsConfig> // should have been named like this from day 0. we should get rid of `getUserSelectedAccountId` function after some amount of time to not confuse ourselves.
  setUserSelectedWorkspaceId: (workspaceId: string) => void
  getWorkspacesConfig: () => Promise<WorkspacesConfig>
}

export interface IConfigBindingEvents extends IBindingSharedEvents {}

export type GlobalConfig = {
  readonly isUpdateNotificationDisabled: boolean
  readonly defaultSpeckleServerUrl: string | null
}

export type ConnectorConfig = {
  darkTheme: boolean
  disableCache?: boolean
}

export type AccountsConfig = {
  userSelectedAccountId: string
}

export type WorkspacesConfig = {
  userSelectedWorkspaceId: string
}

// Useless, but will do for now :)
export class MockedConfigBinding implements IConfigBinding {
  public availableMethodNames: string[] = [
    'getConfig',
    'getGlobalConfig',
    'updateConfig',
    'setUserSelectedAccountId',
    'setUserSelectedWorkspaceId',
    'getAccountsConfig',
    'getWorkspacesConfig',
    'getUserSelectedAccountId',
    'showDevTools',
    'openUrl'
  ]
  public async getIsDevMode() {
    return true
  }

  public async getConfig() {
    return { darkTheme: false, disableCache: false }
  }

  public async getGlobalConfig(): Promise<GlobalConfig> {
    return {
      isUpdateNotificationDisabled: true,
      defaultSpeckleServerUrl: null
    }
  }

  public async updateConfig() {
    console.log('')
  }

  public async setUserSelectedAccountId(accountId: string) {
    console.log(accountId)
  }

  public async setUserSelectedWorkspaceId(workspaceId: string) {
    console.log(workspaceId)
  }

  public async getAccountsConfig() {
    return { userSelectedAccountId: 'whatever' } as AccountsConfig
  }

  public async getWorkspacesConfig() {
    return { userSelectedWorkspaceId: 'whatever' } as WorkspacesConfig
  }

  public async getUserSelectedAccountId() {
    return { userSelectedAccountId: 'whatever' } as AccountsConfig
  }

  public async showDevTools() {
    console.log('No way dude')
  }

  public async openUrl(url: string) {
    window.open(url)
  }

  public on() {
    return
  }
}
