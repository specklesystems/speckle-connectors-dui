<template>
  <div class="flex items-center gap-1.5">
    <div class="flex items-center -space-x-1">
      <template
        v-for="labelItem in maxVisible ? labels.slice(0, maxVisible) : labels"
        :key="labelItem.id"
      >
        <div
          v-if="labelItem.hexColor"
          class="w-2 h-2 rounded-full shrink-0"
          :style="{ backgroundColor: labelItem.hexColor }"
        />
      </template>
    </div>

    <!-- Single label -->
    <span
      v-if="labels.length === 1"
      class="text-body-3xs font-medium flex items-center gap-1"
      :style="{ color: labels[0].hexColor || undefined }"
    >
      {{ labels[0].name }}
    </span>

    <!-- Multiple labels -->
    <span v-else class="text-body-3xs text-foreground-2 font-medium">
      {{ labels.length }} label{{ labels.length !== 1 ? 's' : '' }}
    </span>
  </div>
</template>

<script setup lang="ts">
import type { Label } from '~/lib/issues/types'

defineProps<{
  labels: Label[]
  maxVisible?: number
}>()
</script>
