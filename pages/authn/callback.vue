<template>
  <div class="flex items-center justify-center"><InfiniteLoading /></div>
</template>

<script setup lang="ts">
import { ToastNotificationType } from '@speckle/ui-components'
import { useRoute, useRouter } from 'vue-router'
import { useAuthManager } from '~/lib/authn/useAuthManager'
import { useTokenExchange } from '~/lib/authn/useTokenExchange'
import { useHostAppStore } from '~/store/hostApp'

const route = useRoute()
const router = useRouter()
const { getChallenge, getCodeVerifier, getChallengeUrl } = useAuthManager()
const { exchangeAccessCode } = useTokenExchange()
const hostApp = useHostAppStore()

onMounted(async () => {
  try {
    const origin = getChallengeUrl()
    const accessCode = route.query.access_code as string | undefined
    if (accessCode && origin) {
      const challenge = getChallenge()
      if (!challenge) {
        throw new Error('No challenge found in storage.')
      }
      const codeVerifier = getCodeVerifier() ?? undefined
      await exchangeAccessCode(origin, accessCode, challenge, codeVerifier)
    } else {
      throw new Error('No access code is found.')
    }
  } catch (error) {
    hostApp.setNotification({
      type: ToastNotificationType.Danger,
      title: 'Failed to add your Speckle account.',
      description: error instanceof Error ? error.message : (error as string)
    })
  } finally {
    router.replace('/')
  }
})
</script>
