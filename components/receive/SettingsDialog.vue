<template>
  <div class="p-0">
    <slot name="activator" :toggle="toggleDialog"></slot>
    <CommonDialog
      v-model:open="showSettingsDialog"
      :title="`Load Settings`"
      fullscreen="none"
    >
      <ModelSettings
        :expandable="false"
        :default-settings="(store.receiveSettings as unknown as CardSetting[])"
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
import { useHostAppStore } from '~/store/hostApp'
import type { CardSetting } from '~/lib/models/card/setting'

const props = defineProps<{
  settings?: CardSetting[]
  modelCardId: string
}>()

const store = useHostAppStore()

const showSettingsDialog = ref(false)

const toggleDialog = () => {
  showSettingsDialog.value = !showSettingsDialog.value
}

let newSettings: CardSetting[]
const updateSettings = (settings: CardSetting[]) => {
  console.log('🔧 Settings updated in dialog:', settings)
  newSettings = settings
}

const saveSettings = async () => {
  console.log('💾 Saving settings and marking as expired')

  await store.patchModel(props.modelCardId, {
    settings: newSettings,
    expired: true
  })
  console.log('✅ Settings saved, expired flag set to true')
  showSettingsDialog.value = false
}
</script>
