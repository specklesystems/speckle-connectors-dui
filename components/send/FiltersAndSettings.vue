<template>
  <div class="space-y-4">
    <FilterListSelect @update:filter="updateFilter" />
    <ModelSettings
      v-if="hasSendSettings"
      expandable
      :default-settings="(store.sendSettings as unknown as CardSetting[])"
      @update:settings="updateSettings"
    ></ModelSettings>
  </div>
</template>
<script setup lang="ts">
import type { ISendFilter } from '~/lib/models/card/send'
import { useHostAppStore } from '~/store/hostApp'
import type { CardSetting } from '~/lib/models/card/setting'

const emit = defineEmits<{
  (e: 'update:filter', filter: ISendFilter): void
  (e: 'update:settings', settings: CardSetting[]): void
}>()

const updateFilter = (filter: ISendFilter) => {
  // TODO: something like hostApp.validateSendFilter()
  // which should return a bool and a reason if invalid
  emit('update:filter', filter)
}

const updateSettings = (settings: CardSetting[]) => {
  emit('update:settings', settings)
}

const store = useHostAppStore()
const hasSendSettings = computed(
  () => store.sendSettings && store.sendSettings?.length > 0
)
</script>
