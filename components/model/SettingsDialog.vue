<template>
  <div class="p-0">
    <slot name="activator" :toggle="toggleDialog"></slot>
    <CommonDialog
      v-model:open="showSettingsDialog"
      :title="`Settings`"
      fullscreen="none"
    >
      <ModelSettings
        :expandable="false"
        :default-settings="(props.defaultSettings ?? (props.isSender ? store.sendSettings : store.receiveSettings)) as unknown as CardSetting[]"
        :settings="props.settings"
        @update:settings="updateSettings"
      ></ModelSettings>
      <div class="mt-4 flex justify-end items-center space-x-2">
        <FormButton size="sm" color="outline" @click="showSettingsDialog = false">
          Cancel
        </FormButton>
        <FormButton size="sm" @click="saveSettings()">Save</FormButton>
      </div>
    </CommonDialog>
  </div>
</template>

<script setup lang="ts">
import { useSettingsTracking } from '~/lib/core/composables/trackSettings'
import { useHostAppStore } from '~/store/hostApp'
import type { CardSetting } from '~/lib/models/card/setting'

const { trackSettingsChange } = useSettingsTracking()

const props = defineProps<{
  settings?: CardSetting[]
  modelCardId: string
  defaultSettings?: CardSetting[]
  isSender?: boolean
}>()

const store = useHostAppStore()

const showSettingsDialog = ref(false)

const toggleDialog = () => {
  showSettingsDialog.value = !showSettingsDialog.value
}

let newSettings: CardSetting[]
const updateSettings = (settings: CardSetting[]) => {
  newSettings = settings
}

const saveSettings = async () => {
  trackSettingsChange(
    props.isSender ? 'Publish Card Settings Updated' : 'Load Card Settings Updated',
    newSettings,
    props.defaultSettings || (props.isSender ? store.sendSettings : store.receiveSettings) || []
  )

  await store.patchModel(props.modelCardId, {
    settings: newSettings,
    expired: true
  })
  showSettingsDialog.value = false
}
</script>
