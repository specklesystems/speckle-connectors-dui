<template>
  <div class="flex flex-col space-y-2">
    <FormButton
      text
      size="sm"
      full-width
      @click="showCustomServerInput = !showCustomServerInput"
    >
      {{ showCustomServerInput ? 'Use default server' : 'Set custom server url' }}
    </FormButton>
    <div v-if="showCustomServerInput">
      <FormTextInput
        v-model="customServerUrl"
        name="name"
        :show-label="false"
        placeholder="https://app.speckle.systems"
        color="foundation"
        autocomplete="off"
        show-clear
        @clear="showCustomServerInput = false"
      />
    </div>

    <FormButton v-if="canAddAccount" full-width @click="logIn()">Log in</FormButton>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useAuthManager } from '~/lib/authn/useAuthManager'
import type { BaseBridge } from '~/lib/bridge/base'

const customServerUrl = ref<string | undefined>('https://app.speckle.systems')
const showCustomServerInput = ref(false)

const { $accountBinding } = useNuxtApp()
const canAddAccount = ['AddAccount', 'addAccount'].some((name) =>
  ($accountBinding as unknown as BaseBridge).availableMethodNames.includes(name)
)

const { generateChallenge } = useAuthManager()

const logIn = () => {
  const serverUrl = customServerUrl.value
    ? new URL(customServerUrl.value).origin
    : 'https://app.speckle.systems'
  const challenge = generateChallenge(serverUrl)
  const authUrl = `${serverUrl}/authn/verify/sdui/${challenge}`
  window.location.href = authUrl
}
</script>
