import { md5 } from '@speckle/shared'
import type { Account } from '~/lib/bindings/definitions/IAccountBinding'

/**
 * Checks if the server supports the new /oauth/token endpoint.
 * The server exposes GET /oauth/token returning 'supported' when available.
 */
export async function supportsOAuthToken(serverUrl: string): Promise<boolean> {
  try {
    const res = await fetch(new URL('/oauth/token', serverUrl), { method: 'GET' })
    return res.ok
  } catch {
    return false
  }
}

export function useTokenExchange() {
  const { $accountBinding } = useNuxtApp()

  const exchangeAccessCode = async (
    rawServerUrl: string,
    accessCode: string,
    challenge: string,
    codeVerifier?: string
  ): Promise<void> => {
    // Normalize to origin (strips trailing slash, path, etc.)
    // so account IDs stay consistent with connectors
    const serverUrl = new URL(rawServerUrl).origin
    const tokenHeaders = { 'Content-Type': 'application/json' }
    let tokenResponse: Response

    // If we have a codeVerifier, try the new PKCE-based /oauth/token endpoint first
    if (codeVerifier && (await supportsOAuthToken(serverUrl))) {
      tokenResponse = await fetch(new URL('/oauth/token', serverUrl), {
        method: 'POST',
        headers: tokenHeaders,
        body: JSON.stringify({
          appId: 'sdui',
          appSecret: 'sdui',
          accessCode,
          codeVerifier
        })
      })
    } else {
      // Fall back to legacy /auth/token with plain challenge
      tokenResponse = await fetch(new URL('/auth/token', serverUrl), {
        method: 'POST',
        headers: tokenHeaders,
        body: JSON.stringify({
          appId: 'sdui',
          appSecret: 'sdui',
          accessCode,
          challenge
        })
      })
    }

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
