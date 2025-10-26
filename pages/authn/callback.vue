<template>
  <div class="flex items-center justify-center"><InfiniteLoading /></div>
</template>

<script setup lang="ts">
import { md5 } from '@speckle/shared'
import { ToastNotificationType } from '@speckle/ui-components'
import { useRoute, useRouter } from 'vue-router'
import { useAuthManager } from '~/lib/authn/useAuthManager'
import type { Account } from '~/lib/bindings/definitions/IAccountBinding'
import { useHostAppStore } from '~/store/hostApp'

const route = useRoute()
const router = useRouter()
const { getChallenge } = useAuthManager()
const { $accountBinding } = useNuxtApp()
const hostApp = useHostAppStore()

onMounted(async () => {
  const accessCode = route.query.access_code as string | undefined

  if (accessCode) {
    const challenge = getChallenge()
    const config = useRuntimeConfig()
    const body = {
      appId: config.public.speckleDuiAuthnAppId,
      appSecret: config.public.speckleDuiAuthnAppSecret,
      accessCode,
      challenge
    }

    const serverUrl = 'https://app.speckle.systems'

    // Exchange the access code for a real token (optional)
    const response = await fetch(new URL('/auth/token', serverUrl), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
    if (!response.ok) {
      const errorText = await response.text()

      hostApp.setNotification({
        title: 'Log In',
        type: ToastNotificationType.Danger,
        description: `Token exchange failed with status ${response.status}: ${errorText}`
      })
      // Stop processing and redirect immediately on failure
      return router.replace('/')
    }

    const { token, refreshToken } = (await response.json()) as {
      token: string
      refreshToken: string
    }

    const graphqlQuery = {
      query:
        'query { activeUser { id name email company avatar } serverInfo { name company adminContact description version } }'
    }

    const userAndServerInfoResponse = await fetch(new URL('/graphql', serverUrl), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}` // Add the token as a Bearer token
      },
      body: JSON.stringify(graphqlQuery)
    })

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const userAndServerInfo = await userAndServerInfoResponse.json()
    const accountId = md5(
      userAndServerInfo.data.activeUser.email + serverUrl
    ).toUpperCase()

    const account: Account = {
      id: accountId,
      token,
      refreshToken,
      isDefault: true,
      serverInfo: { url: serverUrl, ...userAndServerInfo.data.serverInfo },
      userInfo: userAndServerInfo.data.activeUser
    }

    await $accountBinding.addAccount(accountId, account)
  }

  router.replace('/')
})
</script>
