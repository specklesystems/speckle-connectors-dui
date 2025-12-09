<template>
  <div class="flex items-center space-x-2">
    <div
      v-if="priority !== null && priority !== 'none'"
      v-tippy="showLabel ? undefined : priorityText"
      class="flex flex-col gap-0.5 items-start justify-center w-3 h-3"
    >
      <!-- Top line -->
      <div
        class="h-0.5 rounded-full bg-foreground-2 w-3"
        :class="priority !== 'high' && 'opacity-25'"
      />
      <!-- Middle line -->
      <div
        class="h-0.5 rounded-full bg-foreground-2 w-2"
        :class="priority === 'low' && 'opacity-25'"
      />
      <!-- Bottom line -->
      <div class="h-0.5 rounded-full bg-foreground-2 w-1" />
    </div>
    <!-- No priority: Two dashes -->
    <div v-else class="flex gap-0.5 items-center justify-center h-3 w-3">
      <div class="h-px rounded-full bg-foreground-3 w-1" />
      <div class="h-px rounded-full bg-foreground-3 w-1" />
    </div>

    <span v-if="showLabel" class="text-body-3xs text-foreground-2 font-medium">
      {{ priorityText }}
    </span>
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    priority: 'none' | 'low' | 'medium' | 'high' | null
    showLabel?: boolean
  }>(),
  {
    showLabel: false
  }
)

const priorityText = computed(() => {
  switch (props.priority) {
    case 'high':
      return 'High'
    case 'medium':
      return 'Medium'
    case 'low':
      return 'Low'
    case 'none':
      return 'No priority'
    case null:
      return 'No priority'
    default:
      return ''
  }
})
</script>
