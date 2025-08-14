<template>
  <div class="space-y-2 p-2 bg-highlight-1 rounded-md text-body-xs">
    <div v-if="!hasSelection">
      No objects selected, go ahead and select some from your model!
    </div>
    <div v-else>{{ selectionSummary }}</div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  hasSelection: boolean
  selectionSummary: string
}>()
</script>
