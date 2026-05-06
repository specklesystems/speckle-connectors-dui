<template>
  <!--
    Shared label for JsonForms control renderers in the connector settings panel.

    Surfaces `description` as a tooltip on hover via `v-tippy`. When the
    description is empty, missing, or whitespace-only, no tooltip is rendered —
    so settings without a description defined render with no visual change.
  -->
  <div v-tippy="tooltip" class="text-foreground-2 text-body-2xs mb-1 pl-1 inline-block">
    {{ label }}
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  label: string
  description?: string
}>()

const tooltip = computed<string | undefined>(() => {
  if (!props.description) return undefined
  const trimmed = props.description.trim()
  return trimmed.length > 0 ? trimmed : undefined
})
</script>
