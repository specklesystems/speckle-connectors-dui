<template>
  <div class="px-2">
    <p class="h5">Layer Selection</p>
    <div class="space-y-2 my-2">
      <!-- Multi-select layer dropdown -->
      <div>
        <FormSelectMulti
          :model-value="selectedLayers"
          name="layerSelection"
          label="Select layers"
          class="w-full"
          fixed-height
          size="sm"
          :items="layerOptions"
          :allow-unset="false"
          by="id"
          search
          :search-placeholder="'Search layers...'"
          :filter-predicate="layerSearchFilterPredicate"
          mount-menu-on-body
          @update:model-value="(value) => $emit('update:selectedLayers', value as LayerOption[])"
        >
          <template #something-selected="{ value }">
            <span class="text-primary text-base text-sm">
              {{ `${value.length} layer${value.length !== 1 ? 's' : ''} selected` }}
            </span>
          </template>
          <template #option="{ item }">
            <span class="text-base text-sm">{{ item.name }}</span>
          </template>
        </FormSelectMulti>
      </div>

      <!-- Layer selection summary -->
      <div
        v-if="selectedLayers.length === 0"
        class="space-y-2 p-2 bg-highlight-1 rounded-md text-body-xs"
      >
        <div class="text-foreground-2">
          No layers selected, choose layers from the dropdown above!
        </div>
      </div>
      <div v-else class="space-y-2 p-2 bg-highlight-1 rounded-md text-body-xs">
        <div>
          Selected {{ selectedLayers.length }} layer{{
            selectedLayers.length !== 1 ? 's' : ''
          }}:
          {{ selectedLayers.map((l) => l.name).join(', ') }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface LayerOption {
  id: string
  name: string
  [key: string]: unknown
}

interface Props {
  selectedLayers: LayerOption[]
  layerOptions: LayerOption[]
}

defineProps<Props>()

defineEmits<{
  'update:selectedLayers': [layers: LayerOption[]]
}>()

// Search predicate for layer dropdown
const layerSearchFilterPredicate = (
  item: LayerOption | string | number | Record<string, unknown>,
  query: string
): boolean => {
  if (typeof item === 'object' && item !== null && 'name' in item) {
    const layerItem = item as LayerOption
    return layerItem.name.toLowerCase().includes(query.toLowerCase())
  }
  return false
}
</script>
