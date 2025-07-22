import type {
  IBinding,
  IBindingSharedEvents
} from '~/lib/bindings/definitions/IBinding'

export const IAccountBindingKey = 'accountsBinding'

export interface IAccountBinding extends IBinding<IAccountBindingEvents> {
  getAccounts: () => Promise<Account[]>
  removeAccount: (accountId: string) => Promise<void>
}

// An almost 1-1 mapping of what we need from the Core accounts class.
export type Account = {
  id: string
  isDefault: boolean
  token: string
  serverInfo: {
    name: string
    url: string
    frontend2: boolean
  }
  userInfo: {
    id: string
    avatar: string
    email: string
    name: string
    commits: { totalCount: number }
    streams: { totalCount: number }
  }
}

export interface IAccountBindingEvents extends IBindingSharedEvents {}

export class MockedAccountBinding implements IAccountBinding {
  public async getAccounts() {
    const config = useRuntimeConfig()
    return (await [
      {
        id: 'whatever',
        isDefault: true,
        token: config.public.speckleToken,
        serverInfo: {
          name: 'test',
          url: config.public.speckleUrl,
          frontend2: true
        },
        userInfo: {
          id: 'whatever',
          avatar: 'whatever',
          email: ''
        }
      }
    ]) as Account[]
  }

  public async removeAccount(accountId: string) {
    return await console.log('no way dude', accountId)
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
