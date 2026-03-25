<template>
  <div class="flex flex-col space-y-2">
    <FormButton v-if="canAddAccount" full-width @click="logIn()">Log in</FormButton>
  </div>
</template>

<script setup lang="ts">
import { useAuthManager } from '~/lib/authn/useAuthManager'
import type { BaseBridge } from '~/lib/bridge/base'

const props = defineProps<{
  serverUrl: string
}>()

const { $accountBinding } = useNuxtApp()
const canAddAccount = ['AddAccount', 'addAccount'].some((name) =>
  ($accountBinding as unknown as BaseBridge).availableMethodNames.includes(name)
)

const { generateChallenge } = useAuthManager()

const logIn = async () => {
  const serverUrl = props.serverUrl
    ? new URL(props.serverUrl).origin
    : 'https://app.speckle.systems'
  const { codeChallenge } = await generateChallenge(serverUrl)
  const authUrl = `${serverUrl}/authn/verify/sdui/${codeChallenge}?code_challenge_method=S256`
  window.location.href = authUrl
}
</script>
