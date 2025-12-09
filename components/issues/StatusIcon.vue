<template>
  <div
    v-tippy="showLabel ? undefined : statusText"
    class="flex items-center gap-1 rounded-md hover:bg-foreground-1"
  >
    <GlobalIconStatusOpen v-if="status === 'open'" class="w-3 h-3 shrink-0" />
    <GlobalIconStatusReview
      v-else-if="status === 'readyForReview'"
      class="w-3 h-3 shrink-0"
    />
    <GlobalIconStatusResolved
      v-else-if="status === 'resolved'"
      class="w-3 h-3 shrink-0"
    />

    <span v-if="showLabel" class="text-body-3xs text-foreground-2 font-medium">
      {{ statusText }}
    </span>
  </div>
</template>

<script setup lang="ts">
import GlobalIconStatusOpen from '~/components/global/icon/StatusOpen.vue'
import GlobalIconStatusReview from '~/components/global/icon/StatusReview.vue'
import GlobalIconStatusResolved from '~/components/global/icon/StatusResolved.vue'

const props = withDefaults(
  defineProps<{
    status: 'open' | 'readyForReview' | 'resolved'
    showLabel?: boolean
  }>(),
  {
    showLabel: false
  }
)

const statusText = computed(() => {
  switch (props.status) {
    case 'open':
      return 'Open'
    case 'readyForReview':
      return 'Ready for review'
    case 'resolved':
      return 'Resolved'
    default:
      return ''
  }
})
</script>
