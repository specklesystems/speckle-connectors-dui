<template>
  <div
    v-if="
      store.isDistributedBySpeckle &&
      store.latestAvailableVersion &&
      !store.isConnectorUpToDate &&
      !hasDismissedAlert &&
      !store.isUpdateNotificationDisabled
    "
    class="flex items-center gap-2.5 mx-2.5 mt-2 mb-2 px-2.5 py-2 bg-foundation border border-outline-2 rounded-md shadow-[0_1px_0_rgba(15,23,42,0.02)]"
    role="status"
  >
    <div
      class="w-[26px] h-[26px] rounded flex items-center justify-center flex-shrink-0 bg-violet-100 text-violet-600 dark:bg-violet-900/20 dark:text-violet-400"
    >
      <SparklesIcon class="w-[15px] h-[15px]" style="stroke-width: 1.75" />
    </div>
    <div class="flex-1 min-w-0">
      <div class="text-body-2xs font-bold text-foreground leading-tight">
        Update available
      </div>
      <div class="flex items-baseline gap-1 text-body-3xs">
        <span class="text-foreground-2">v{{ store.connectorVersion }}</span>
        <span class="text-foreground-2">→</span>
        <span class="font-semibold text-foreground">
          v{{ store.latestAvailableVersion?.Number }}
        </span>
      </div>
    </div>
    <FormButton size="sm" @click="store.downloadLatestVersion()">Update</FormButton>
    <FormButton
      size="sm"
      color="subtle"
      hide-text
      :icon-left="XMarkIcon"
      @click="hasDismissedAlert = true"
    />
  </div>
</template>
<script setup lang="ts">
import { SparklesIcon, XMarkIcon } from '@heroicons/vue/24/outline'
import { useHostAppStore } from '~~/store/hostApp'
const store = useHostAppStore()
const hasDismissedAlert = ref(false)
</script>
