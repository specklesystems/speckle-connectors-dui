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
  isUpdateNotificationEnabled: boolean
}

export type ConnectorConfig = {
  darkTheme: boolean
}

export type AccountsConfig = {
  userSelectedAccountId: string
}

export type WorkspacesConfig = {
  userSelectedWorkspaceId: string
}

// Useless, but will do for now :)
export class MockedConfigBinding implements IConfigBinding {
  public async getIsDevMode() {
    return await true
  }

  public async getConfig() {
    return await { darkTheme: false }
  }

  public async getGlobalConfig() {
    return await { isUpdateNotificationEnabled: true }
  }

  public async updateConfig() {
    return await console.log('')
  }

  public async setUserSelectedAccountId(accountId: string) {
    return await console.log(accountId)
  }

  public async setUserSelectedWorkspaceId(workspaceId: string) {
    return await console.log(workspaceId)
  }

  public async getAccountsConfig() {
    return (await { userSelectedAccountId: 'whatever' }) as AccountsConfig
  }

  public async getWorkspacesConfig() {
    return (await { userSelectedWorkspaceId: 'whatever' }) as WorkspacesConfig
  }

  public async getUserSelectedAccountId() {
    return (await { userSelectedAccountId: 'whatever' }) as AccountsConfig
  }

  public async showDevTools() {
    await console.log('No way dude')
  }

  public async openUrl(url: string) {
    await window.open(url)
  }

  public on() {
    return
  }
}
