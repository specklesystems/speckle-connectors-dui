<template>
  <div class="flex flex-col space-y-2">
    <div v-if="isDesktopServiceAvailable">
      <div v-show="!isAddingAccount" class="text-foreground-2 space-y-2">
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
        <div class="flex space-x-2">
          <FormButton
            color="outline"
            class="px-1"
            :icon-left="ArrowLeftIcon"
            hide-text
            @click="emit('backToSignIn')"
          />

          <FormButton full-width @click="startAccountAddFlow()">
            Sign in (Legacy)
          </FormButton>
        </div>
      </div>

      <div v-show="isAddingAccount" class="text-foreground-2 mt-2 mb-4 space-y-2">
        <div class="text-sm text-center">
          Please check your browser: waiting for authorization to complete.
        </div>
        <div class="py-2"><CommonLoadingBar :loading="isAddingAccount" /></div>
        <div v-if="showHelp" class="bg-blue-500/10 p-2 rounded-md space-y-2">
          <div class="text-sm text-center">Having trouble?</div>
          <FormButton size="sm" full-width @click="restartFlow()">Retry</FormButton>
          <FormButton
            text
            size="sm"
            full-width
            @click="$openUrl('https://speckle.community')"
          >
            Get in touch with us
          </FormButton>
        </div>
      </div>
    </div>
    <div v-else class="space-y-3">
      <div class="text-foreground-2 text-sm">
        The Speckle Desktop Service is required to add accounts. This background service
        handles authentication securely.
      </div>
      <div class="flex space-x-2">
        <FormButton
          color="outline"
          class="px-1"
          :icon-left="ArrowLeftIcon"
          hide-text
          @click="emit('backToSignIn')"
        />
        <FormButton full-width @click="$openUrl('https://releases.speckle.systems')">
          Download Desktop Service
        </FormButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useIntervalFn } from '@vueuse/core'
import { useHostAppStore } from '~/store/hostApp'
import { ToastNotificationType } from '@speckle/ui-components'
import { useMixpanel } from '~/lib/core/composables/mixpanel'
import { useAccountStore } from '~~/store/accounts'
import { useDesktopService } from '~/lib/core/composables/desktopService'
import { ArrowLeftIcon } from '@heroicons/vue/24/solid'

const accountStore = useAccountStore()
const { pingDesktopService } = useDesktopService()
const hostApp = useHostAppStore()
const app = useNuxtApp()
const { trackEvent } = useMixpanel()

const emit = defineEmits<{
  (e: 'backToSignIn'): void
}>()

const showCustomServerInput = ref(false)
const isAddingAccount = ref(false)
const isDesktopServiceAvailable = ref(false) // this should be false default because there is a delay if /ping is not successful.
const customServerUrl = ref<string | undefined>(undefined)
const showHelp = ref(false)

const accountCheckerIntervalFn = useIntervalFn(
  async () => {
    const previousAccountCount = accountStore.accounts.length
    await accountStore.refreshAccounts()
    const currentAccountCount = accountStore.accounts.length
    if (previousAccountCount !== currentAccountCount) {
      isAddingAccount.value = false
      showCustomServerInput.value = false
      accountCheckerIntervalFn.pause()
      trackEvent('DUI Account Added')
    }
  },
  1000,
  { immediate: false }
)

const startAccountAddFlow = () => {
  isAddingAccount.value = true
  accountCheckerIntervalFn.resume()
  setTimeout(() => {
    showHelp.value = true
  }, 10_000)
  const url = customServerUrl.value
    ? `http://localhost:29364/auth/add-account?serverUrl=${
        new URL(customServerUrl.value).origin
      }`
    : `http://localhost:29364/auth/add-account`

  app.$openUrl(url)

  // this is a annoying timeout that we cannot detect if user added same account or not.
  setTimeout(() => {
    if (isAddingAccount.value) {
      isAddingAccount.value = false
      showCustomServerInput.value = false
      accountCheckerIntervalFn.pause()
      // Note to Dim: not sure about toast
      hostApp.setNotification({
        title: 'Sign In',
        type: ToastNotificationType.Info,
        description:
          'Sign in timed out. This may have happened because you tried adding an existing account.'
      })
      // TODO: we could log it to sentry/seq later to see how likely it happens?
    }
  }, 30_000)
}

const restartFlow = () => {
  isAddingAccount.value = false
  showHelp.value = false
}

onMounted(async () => {
  isDesktopServiceAvailable.value = await pingDesktopService()
})
</script>
