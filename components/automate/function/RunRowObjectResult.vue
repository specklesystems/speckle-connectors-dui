<template>
  <div :class="`overflow-hidden`">
    <button
      :class="`block transition text-left hover:bg-primary-muted hover:shadow-md rounded-md p-1 cursor-pointer border-l-2 border-primary bg-primary-muted shadow-md`"
      @click="handleClick()"
    >
      <div class="flex items-center space-x-1">
        <div>
          <Component :is="iconAndColor.icon" :class="`w-4 h-4 ${iconAndColor.color}`" />
        </div>
        <div :class="`text-xs ${iconAndColor.color}`">
          {{ result.category }}:
          {{
            'objectIds' in props.result
              ? props.result.objectIds.length
              : props.result.objectAppIds.length
          }}
          affected elements
        </div>
      </div>
      <div v-if="result.message" class="text-xs text-foreground-2 pl-5">
        {{ result.message }}
      </div>
    </button>
  </div>
</template>
<script setup lang="ts">
import {
  XMarkIcon,
  InformationCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/vue/24/outline'
import type { Automate } from '@speckle/shared'
import type { IModelCard } from '~/lib/models/card'

type ObjectResult = Automate.AutomateTypes.ResultsSchema['values']['objectResults'][0]

const props = defineProps<{
  modelCard: IModelCard
  result: ObjectResult
  functionId?: string
}>()
const app = useNuxtApp()

const applicationIds = computed(() => {
  // Old schema ignore
  if ('objectIds' in props.result) return []
  return Object.values(props.result.objectAppIds).filter((id) => id !== null)
})

const handleClick = async () => {
  if (applicationIds.value.length === 0) return
  await app.$baseBinding.highlightObjects(applicationIds.value)
}

const iconAndColor = computed(() => {
  switch (props.result.level) {
    case 'ERROR':
      return {
        icon: XMarkIcon,
        color: 'text-danger font-medium'
      }
    case 'WARNING':
      return {
        icon: ExclamationTriangleIcon,
        color: 'text-warning font-medium'
      }
    case 'INFO':
    default:
      return {
        icon: InformationCircleIcon,
        color: 'text-foreground font-medium'
      }
  }
})
</script>
