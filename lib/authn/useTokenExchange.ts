import { md5 } from '@speckle/shared'
import type { Account } from '~/lib/bindings/definitions/IAccountBinding'

export function useTokenExchange() {
  const { $accountBinding } = useNuxtApp()

  const exchangeAccessCode = async (
    serverUrl: string,
    accessCode: string,
    challenge: string
  ): Promise<void> => {
    // Exchange the access code for a real token
    const tokenResponse = await fetch(new URL('/auth/token', serverUrl), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        appId: 'sdui',
        appSecret: 'sdui',
        accessCode,
        challenge
      })
    })

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      throw new Error(
        `Token exchange failed with status ${tokenResponse.status}: ${errorText}`
      )
    }

    const { token, refreshToken } = (await tokenResponse.json()) as {
      token: string
      refreshToken: string
    }

    // Query user and server info
    const graphqlQuery = {
      query:
        'query { activeUser { id name email company avatar } serverInfo { name company adminContact description version } }'
    }

    const userAndServerInfoResponse = await fetch(new URL('/graphql', serverUrl), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(graphqlQuery)
    })

    if (!userAndServerInfoResponse.ok) {
      throw new Error(
        `Failed to fetch user info with status ${userAndServerInfoResponse.status}`
      )
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const userAndServerInfo = await userAndServerInfoResponse.json()

    const accountId = md5(
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      userAndServerInfo.data.activeUser.email + serverUrl
    ).toUpperCase()

    const account: Account = {
      id: accountId,
      token,
      refreshToken,
      isDefault: true,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      serverInfo: { url: serverUrl, ...userAndServerInfo.data.serverInfo },
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      userInfo: userAndServerInfo.data.activeUser
    }

    await $accountBinding.addAccount(accountId, account)
  }

  return { exchangeAccessCode }
}
