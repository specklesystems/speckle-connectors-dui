<template>
  <div id="speckle" class="bg-foundation-page text-foreground overflow-auto">
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
    <!-- Teleport is fixing the non-clickable toast notifications if any dialog is active. It was marking div as inert and causing the issue -->
    <Teleport to="body">
      <SingletonToastManager />
    </Teleport>
  </div>
</template>
<script setup lang="ts">
import { useAnalytics } from '~/lib/core/composables/mixpanel'
import { useConfigStore } from '~/store/config'
import { useAccountStore } from '~/store/accounts'
import { useHostAppStore } from '~/store/hostApp'
import { storeToRefs } from 'pinia'
import { logToSeq } from '~/lib/logger/composables/useLogger'

const uiConfigStore = useConfigStore()
const { isDarkTheme } = storeToRefs(uiConfigStore)
const hostAppStore = useHostAppStore()
const { connectorVersion, hostAppName, hostAppVersion } = storeToRefs(hostAppStore)

useHead({
  title: computed(
    () =>
      `CNX: (hostApp: ${hostAppName.value}:v${hostAppVersion.value}),(version: ${connectorVersion.value})`
  ),
  htmlAttrs: {
    lang: 'en',
    class: computed(() => (isDarkTheme.value ? `dark` : ``))
  },
  bodyAttrs: {
    class: 'simple-scrollbar bg-foundation-page text-foreground '
  },
  // For standalone vue devtools see: https://devtools.vuejs.org/guide/installation.html#standalone
  script: import.meta.dev ? ['http://localhost:8098'] : []
})

onMounted(() => {
  const { addConnectorToProfile, identifyProfile } = useAnalytics()

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { $intercom } = useNuxtApp() // needed her for initialisation

  logToSeq('Information', 'DUI3 initialized')
})
</script>
