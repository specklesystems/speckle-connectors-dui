<template>
  <div class="py-1 px-2 bg-foundation border rounded-lg">
    <div class="flex justify-between items-center">
      <div class="text-sm font-medium grow">{{ categoryLabel }}</div>

      <div class="flex space-x-1">
        <div class="flex justify-center items-center text-xs text-foreground-2 mr-1">
          {{ countText }}
        </div>
        <FormButton
          v-if="tooltipText"
          v-tippy="tooltipText"
          size="sm"
          color="outline"
          :icon-left="CursorArrowRaysIcon"
          hide-text
          @click="$emit('select')"
        />
        <FormButton
          v-else
          size="sm"
          color="outline"
          :icon-left="CursorArrowRaysIcon"
          hide-text
          @click="$emit('select')"
        />
        <FormButton class="!px-1.5" size="sm" color="outline" @click="$emit('clear')">
          <TrashIcon class="w-3 h-3" />
        </FormButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { CursorArrowRaysIcon, TrashIcon } from '@heroicons/vue/24/outline'

interface Props {
  categoryLabel: string
  countText: string
  tooltipText?: string
}

defineProps<Props>()

defineEmits<{
  select: []
  clear: []
}>()
</script>
