<template>
  <LayoutPanel fancy-glow class="transition pointer-events-auto w-full">
    <h1
      class="h4 w-full bg-red-400 text-center font-bold bg-gradient-to-r from-blue-500 via-blue-400 to-blue-600 inline-block py-1 text-transparent bg-clip-text"
    >
      Welcome to Speckle
    </h1>
    <div v-if="isDesktopServiceAvailable">
      <AccountsSignInFlow />
    </div>
    <div v-else>
      <div class="text-foreground-2 mt-2 mb-4">
        To sign in and start using Speckle, you'll need the Desktop Service running.
        This lightweight background service handles secure authentication.
      </div>
      <div class="space-y-3">
        <FormButton
          full-width
          @click="
            $openUrl(
              'https://releases.speckle.systems/api/desktop-services/latest-installer'
            )
          "
        >
          Download Desktop Service
        </FormButton>
        <div class="text-center">
          <div class="text-foreground-2 text-xs mb-2">Already installed?</div>
          <FormButton
            size="sm"
            full-width
            text
            link
            @click="accountStore.refreshAccounts()"
          >
            Refresh to check again
          </FormButton>
        </div>
      </div>
    </div>
  </LayoutPanel>
</template>

<script setup lang="ts">
import { useAccountStore } from '~~/store/accounts'
import { useDesktopService } from '~/lib/core/composables/desktopService'

const accountStore = useAccountStore()
const { pingDesktopService } = useDesktopService()

const isDesktopServiceAvailable = ref(false) // this should be false default because there is a delay if /ping is not successful.

onMounted(async () => {
  isDesktopServiceAvailable.value = await pingDesktopService()
})
</script>
