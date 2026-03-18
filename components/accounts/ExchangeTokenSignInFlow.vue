<template>
  <div class="flex flex-col space-y-2">
    <!-- idle: server URL + sign in button -->
    <template v-if="state === 'idle'">
      <div class="flex space-x-2">
        <FormButton
          v-if="canAddAccount"
          full-width
          color="outline"
          @click="openBrowserAuth()"
        >
          Log in with OAuth token
        </FormButton>
      </div>
    </template>

    <!-- waiting: instructions + code input -->
    <template v-if="state === 'waiting' || state === 'submitting'">
      <div class="text-foreground-2 space-y-2 border rounded-lg p-2">
        <div class="text-sm text-center">
          Check your browser: authorize the app, then copy the exchange code and paste
          it below.
        </div>
        <div class="py-2"><CommonLoadingBar :loading="state === 'waiting'" /></div>
        <FormTextInput
          v-model="exchangeCode"
          name="exchangeCode"
          :show-label="false"
          placeholder="Paste exchange code here"
          color="foundation"
          autocomplete="off"
          :disabled="state === 'submitting'"
        />
        <FormButton
          full-width
          :disabled="!exchangeCode?.trim() || state === 'submitting'"
          @click="submitCode()"
        >
          {{ state === 'submitting' ? 'Signing in...' : 'Submit' }}
        </FormButton>

        <div v-if="showHelp" class="p-2 rounded-md space-y-1">
          <div class="text-sm text-center">Having trouble?</div>
          <div class="flex justify-center">
            <span>
              <FormButton size="sm" text @click="retryFlow()">Retry</FormButton>
              or
              <FormButton text size="sm" @click="$openUrl('https://speckle.community')">
                Get in touch with us
              </FormButton>
            </span>
          </div>
        </div>
      </div>
    </template>

    <!-- error -->
    <template v-if="state === 'error'">
      <div class="text-foreground-2 space-y-2">
        <div class="text-sm text-center text-red-500">
          {{ errorMessage }}
        </div>
        <FormButton full-width @click="retryFlow()">Try again</FormButton>
        <FormButton text size="sm" full-width @click="emit('backToSignIn')">
          Back
        </FormButton>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useAuthManager } from '~/lib/authn/useAuthManager'
import { useTokenExchange } from '~/lib/authn/useTokenExchange'
import { useMixpanel } from '~/lib/core/composables/mixpanel'
import { useAccountStore } from '~/store/accounts'
import type { BaseBridge } from '~/lib/bridge/base'

const props = defineProps<{
  serverUrl: string
}>()

const emit = defineEmits<{
  (e: 'backToSignIn'): void
}>()

const app = useNuxtApp()
const { generateLocalChallenge } = useAuthManager()
const { exchangeAccessCode } = useTokenExchange()
const { trackEvent } = useMixpanel()
const accountStore = useAccountStore()

const { $accountBinding } = useNuxtApp()
const canAddAccount = ['AddAccount', 'addAccount'].some((name) =>
  ($accountBinding as unknown as BaseBridge).availableMethodNames.includes(name)
)

const state = ref<'idle' | 'waiting' | 'submitting' | 'error'>('idle')
const exchangeCode = ref<string | undefined>()
const errorMessage = ref('')
const showHelp = ref(false)

let currentChallenge = ''
let currentServerUrl = ''

const openBrowserAuth = () => {
  currentServerUrl = props.serverUrl
    ? new URL(props.serverUrl).origin
    : 'https://app.speckle.systems'

  currentChallenge = generateLocalChallenge()
  const authUrl = `${currentServerUrl}/authn/verify/sdui/${currentChallenge}?returnExchangeToken=true`
  app.$openUrl(authUrl)

  state.value = 'waiting'
  exchangeCode.value = undefined
  showHelp.value = false

  setTimeout(() => {
    if (state.value === 'waiting') {
      showHelp.value = true
    }
  }, 10_000)
}

const submitCode = async () => {
  const code = exchangeCode.value?.trim()
  if (!code || !currentChallenge || !currentServerUrl) return

  state.value = 'submitting'
  try {
    await exchangeAccessCode(currentServerUrl, code, currentChallenge)
    void trackEvent('DUI Account Added')
    // Refresh accounts so the watcher in Menu.vue detects the new account and closes the dialog
    await accountStore.refreshAccounts()
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : 'Failed to sign in. Please try again.'
    state.value = 'error'
  }
}

const retryFlow = () => {
  state.value = 'idle'
  exchangeCode.value = undefined
  errorMessage.value = ''
  showHelp.value = false
}
</script>
