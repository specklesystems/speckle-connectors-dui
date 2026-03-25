<template>
  <div class="flex flex-col space-y-2">
    <FormButton v-if="canAddAccount" full-width @click="logIn()">Log in</FormButton>
  </div>
</template>

<script setup lang="ts">
import { useAuthManager } from '~/lib/authn/useAuthManager'
import type { BaseBridge } from '~/lib/bridge/base'
import { useAccountStore } from '~/store/accounts'
import { useHostAppStore } from '~/store/hostApp'
import { ToastNotificationType } from '@speckle/ui-components'

const props = defineProps<{
  serverUrl: string
}>()

const accountStore = useAccountStore()
const hostAppStore = useHostAppStore()
const { $accountBinding } = useNuxtApp()
const canAddAccount = ['AddAccount', 'addAccount'].some((name) =>
  ($accountBinding as unknown as BaseBridge).availableMethodNames.includes(name)
)
const canStartAuthAccount = ['AuthenticateAccount', 'authenticateAccount'].some(
  (name) =>
    ($accountBinding as unknown as BaseBridge).availableMethodNames.includes(name)
)

const { generateChallenge } = useAuthManager()

const logIn = async () => {
  const serverUrl = props.serverUrl
    ? new URL(props.serverUrl).origin
    : 'https://app.speckle.systems'
  if (canStartAuthAccount) {
    const acc = await $accountBinding.authenticateAccount(serverUrl)
    if (acc.token) {
      await accountStore.refreshAccounts()
    } else {
      hostAppStore.setNotification({
        title: 'Log In',
        type: ToastNotificationType.Info,
        description:
          "Log in could not completed. Make sure you have logged in successfully, otherwise try 'Log in with OAuth token'"
      })
    }
  } else {
    const { codeChallenge } = await generateChallenge(serverUrl)
    const authUrl = `${serverUrl}/authn/verify/sdui/${codeChallenge}?code_challenge_method=S256`
    window.location.href = authUrl
  }
}
</script>
