<template>
  <Tippy interactive placement="bottom" :offset="[0, 6]">
    <!-- Trigger -->
    <template #default>
      <IssuesLabelGroup :labels="labels" />
    </template>

    <!-- Tooltip content -->
    <template v-if="labels.length > 0" #content>
      <div class="rounded-md shadow-lg p-0.5 text-xs space-y-1">
        <div
          v-for="label in labels"
          :key="label.id"
          class="flex items-center space-x-2"
        >
          <span
            class="w-2 h-2 rounded-full"
            :style="{ backgroundColor: label.hexColor }"
          />
          <span>{{ label.name }}</span>
        </div>
      </div>
    </template>
  </Tippy>
</template>

<script setup lang="ts">
import { Tippy } from 'vue-tippy'
import type { Label } from '~/lib/issues/types'

defineProps<{
  labels: Label[]
}>()
</script>
