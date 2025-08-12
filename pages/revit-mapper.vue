<template>
  <div class="flex flex-col space-y-2">
    <div class="px-2 mt-2">
      <FormButton to="/" size="sm" :icon-left="ArrowLeftIcon" class="my-2">
        Home
      </FormButton>
      <hr />
    </div>

    <!-- Step 1: Mapping Mode Selection -->
    <div class="px-2">
      <p class="h5">Mapping Mode</p>
      <div class="space-y-2 my-2">
        <div>
          <FormSelectBase
            :model-value="selectedMappingMode"
            name="mappingMode"
            label="Mapping mode"
            class="w-full"
            fixed-height
            size="sm"
            :items="mappingModeOptions"
            :allow-unset="false"
            mount-menu-on-body
            @update:model-value="handleModeChange"
          >
            <template #something-selected="{ value }">
              <span class="text-primary text-base text-sm">{{ value }}</span>
            </template>
            <template #option="{ item }">
              <span class="text-base text-sm">{{ item }}</span>
            </template>
          </FormSelectBase>
        </div>

        <!-- Mode-specific content -->
        <div v-if="selectedMappingMode === 'Selection'">
          <div class="space-y-2 p-2 bg-highlight-1 rounded-md text-body-xs">
            <div v-if="(selectionInfo?.selectedObjectIds?.length || 0) === 0">
              No objects selected, go ahead and select some from your model!
            </div>
            <div v-else>{{ selectionInfo?.summary }}</div>
          </div>
        </div>

        <div v-if="selectedMappingMode === 'Layer'" class="px-2">
          <p class="h5">Layer Selection</p>
          <div class="space-y-2 my-2">
            <!-- Multi-select layer dropdown -->
            <div>
              <FormSelectMulti
                v-model="selectedLayers"
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
              >
                <template #something-selected="{ value }">
                  <span class="text-primary text-base text-sm">
                    {{
                      `${value.length} layer${value.length !== 1 ? 's' : ''} selected`
                    }}
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
      </div>
    </div>

    <!-- Step 2: Category Selection -->
    <div v-if="hasTargetsSelected" class="px-2">
      <p class="h5">Target Category</p>
      <div class="space-y-2 my-2">
        <div class="flex space-x-2">
          <div class="flex-1">
            <FormSelectBase
              key="label"
              v-model="selectedCategory"
              name="categoryMapping"
              placeholder="Select a category"
              label="Target Category"
              fixed-height
              size="sm"
              search
              :search-placeholder="''"
              :filter-predicate="searchFilterPredicate"
              :items="categoryOptions"
              :allow-unset="false"
              mount-menu-on-body
            >
              <template #something-selected="{ value }">
                <span class="text-primary text-xs">
                  {{ Array.isArray(value) ? value[0]?.label : value?.label }}
                </span>
              </template>
              <template #option="{ item }">
                <span class="text-xs">{{ item.label }}</span>
              </template>
            </FormSelectBase>
          </div>

          <!-- Apply button -->
          <FormButton
            color="primary"
            size="sm"
            class="h-8"
            :disabled="!selectedCategory"
            @click="assignToCategory()"
          >
            Apply Mapping
          </FormButton>
        </div>
      </div>
    </div>

    <hr v-if="hasTargetsSelected" />

    <!-- Step 3: Mappings Summary Tables -->
    <div
      v-if="currentMappings.length > 0 || currentLayerMappings.length > 0"
      class="px-2"
    >
      <p class="h5">Current Mappings</p>

      <!-- Object Mappings Section -->
      <div v-if="currentMappings.length > 0" class="my-2">
        <div class="text-sm font-medium text-foreground-2 mb-1">Object Mappings</div>
        <div class="space-y-1">
          <div
            v-for="mapping in currentMappings"
            :key="mapping.categoryValue"
            class="py-1 px-2 bg-foundation border rounded-lg"
          >
            <div class="flex justify-between items-center">
              <div class="text-sm font-medium grow">{{ mapping.categoryLabel }}</div>

              <div class="flex space-x-1">
                <div
                  class="flex justify-center items-center text-xs text-foreground-2 mr-1"
                >
                  {{ mapping.objectCount }} object{{
                    mapping.objectCount !== 1 ? 's' : ''
                  }}
                </div>
                <FormButton
                  size="sm"
                  color="outline"
                  :icon-left="CursorArrowRaysIcon"
                  hide-text
                  @click="selectMappedObjects(mapping)"
                />
                <FormButton
                  class="!px-1.5"
                  size="sm"
                  color="outline"
                  @click="clearMapping(mapping)"
                >
                  <TrashIcon class="w-3 h-3" />
                </FormButton>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Layer Mappings Section -->
      <div v-if="currentLayerMappings.length > 0" class="my-2">
        <div class="text-sm font-medium text-foreground-2 mb-1">Layer Mappings</div>
        <div class="space-y-1">
          <div
            v-for="layerMapping in currentLayerMappings"
            :key="layerMapping.categoryValue"
            class="py-1 px-2 bg-foundation border rounded-lg"
          >
            <div class="flex justify-between items-center">
              <div class="text-sm font-medium grow">
                {{ layerMapping.categoryLabel }}
              </div>

              <div class="flex space-x-1">
                <div
                  class="flex justify-center items-center text-xs text-foreground-2 mr-1"
                >
                  {{ layerMapping.layerCount }} layer{{
                    layerMapping.layerCount !== 1 ? 's' : ''
                  }}
                </div>
                <!-- Tooltip showing layer names -->
                <FormButton
                  v-tippy="`Layers: ${layerMapping.layerNames.join(', ')}`"
                  size="sm"
                  color="outline"
                  :icon-left="CursorArrowRaysIcon"
                  hide-text
                  @click="selectMappedLayers(layerMapping)"
                />
                <FormButton
                  class="!px-1.5"
                  size="sm"
                  color="outline"
                  @click="clearLayerMapping(layerMapping)"
                >
                  <TrashIcon class="w-3 h-3" />
                </FormButton>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Clear all button -->
      <div class="flex justify-end">
        <FormButton
          v-if="selectedMappingMode === 'Selection' && currentMappings.length > 0"
          size="sm"
          color="danger"
          @click="clearAllMappings()"
        >
          Clear All Objects
        </FormButton>
        <FormButton
          v-if="selectedMappingMode === 'Layer' && currentLayerMappings.length > 0"
          size="sm"
          color="danger"
          @click="clearAllLayerMappings()"
        >
          Clear All Layers
        </FormButton>
      </div>
    </div>

    <!-- Mode Confirmation Dialog -->
    <CommonDialog
      v-model:open="showModeConfirmDialog"
      title="Switch Mapping Mode"
      fullscreen="none"
    >
      <div class="text-sm text-foreground">
        {{ conflictMessage }}
      </div>

      <div class="mt-4 flex justify-end space-x-2">
        <FormButton size="sm" color="outline" @click="cancelModeChange()">
          Cancel
        </FormButton>
        <FormButton size="sm" color="danger" @click="confirmModeChange()">
          Clear & Switch
        </FormButton>
      </div>
    </CommonDialog>
  </div>
</template>

<script setup lang="ts">
// === IMPORTS ===
import { storeToRefs } from 'pinia'
import { ArrowLeftIcon, CursorArrowRaysIcon } from '@heroicons/vue/20/solid'
import { TrashIcon } from '@heroicons/vue/24/outline'
import { useSelectionStore } from '~/store/selection'
import type {
  Category,
  CategoryMapping,
  LayerCategoryMapping
} from '~/lib/bindings/definitions/IRevitMapperBinding'

// === STORES ===
const selectionStore = useSelectionStore()
const { selectionInfo } = storeToRefs(selectionStore)

// === STATE ===
const selectedMappingMode = ref<string>('Selection')
const mappingModeOptions = ['Selection', 'Layer']
const selectedCategory = ref<Category | null>(null)
const categoryOptions = ref<Category[]>([])
const mappings = ref<CategoryMapping[]>([])

// Layer-specific state
const selectedLayers = ref<LayerOption[]>([])
const layerOptions = ref<LayerOption[]>([])
const layerMappings = ref<LayerCategoryMapping[]>([])

// Mode switching state
const showModeConfirmDialog = ref(false)
const pendingMode = ref<string>('')
const conflictMessage = ref('')

// === TYPES ===
interface LayerOption {
  id: string
  name: string
}

// === COMPUTED ===
const hasTargetsSelected = computed(() => {
  if (selectedMappingMode.value === 'Selection') {
    return (selectionInfo.value?.selectedObjectIds?.length || 0) > 0
  } else if (selectedMappingMode.value === 'Layer') {
    return selectedLayers.value.length > 0
  }
  return false
})

// Show appropriate mappings based on current mode
const currentMappings = computed(() => {
  return selectedMappingMode.value === 'Selection' ? mappings.value : []
})

const currentLayerMappings = computed(() => {
  return selectedMappingMode.value === 'Layer' ? layerMappings.value : []
})

// === METHODS ===
const app = useNuxtApp()
const { $revitMapperBinding, $baseBinding } = app

// Search predicate for category dropdown
const searchFilterPredicate = (item: Category, query: string) => {
  return item.label.toLowerCase().includes(query.toLowerCase())
}

// Search predicate for layer dropdown
const layerSearchFilterPredicate = (item: LayerOption, query: string) => {
  return item.name.toLowerCase().includes(query.toLowerCase())
}

// Handle mode changes with conflict checking
const handleModeChange = (newMode: string) => {
  // If switching to same mode, do nothing
  if (newMode === selectedMappingMode.value) return

  // Check for conflicts - ONLY show dialog if there are existing mappings
  if (newMode === 'Layer' && mappings.value.length > 0) {
    // Switching to Layer mode with existing object mappings
    pendingMode.value = newMode
    conflictMessage.value = `Switching to Layer mode will clear all current object mappings. Continue?`
    showModeConfirmDialog.value = true
  } else if (newMode === 'Selection' && layerMappings.value.length > 0) {
    // Switching to Selection mode with existing layer mappings
    pendingMode.value = newMode
    conflictMessage.value = `Switching to Selection mode will clear all current layer mappings. Continue?`
    showModeConfirmDialog.value = true
  } else {
    // No conflicts, switch directly (no existing mappings or switching to same mode)
    selectedMappingMode.value = newMode
  }
}

// Cancel mode change
const cancelModeChange = () => {
  showModeConfirmDialog.value = false
  pendingMode.value = ''
  conflictMessage.value = ''
  // FormSelectBase will remain at current value since we didn't update selectedMappingMode
}

// Confirm mode change and clear conflicting mappings
const confirmModeChange = async () => {
  try {
    if (pendingMode.value === 'Layer') {
      // Clear all object mappings before switching to Layer mode
      await $revitMapperBinding?.clearAllObjectsCategoryAssignments()
    } else if (pendingMode.value === 'Selection') {
      // Clear all layer mappings before switching to Selection mode
      await $revitMapperBinding?.clearAllLayerCategoryAssignments()
    }

    // Switch mode
    selectedMappingMode.value = pendingMode.value
    await refreshMappings()

    // Close dialog
    showModeConfirmDialog.value = false
    pendingMode.value = ''
    conflictMessage.value = ''
  } catch (error) {
    console.error('Failed to clear mappings during mode switch:', error)
  }
}

// Assign selected objects/layers to the chosen category
const assignToCategory = async () => {
  if (!selectedCategory.value || !hasTargetsSelected.value) return

  try {
    if (selectedMappingMode.value === 'Selection') {
      await $revitMapperBinding?.assignObjectsToCategory(
        selectionInfo.value?.selectedObjectIds || [],
        selectedCategory.value.value
      )
    } else if (selectedMappingMode.value === 'Layer') {
      await $revitMapperBinding?.assignLayerToCategory(
        selectedLayers.value.map((layer) => layer.id),
        selectedCategory.value.value
      )
      selectedLayers.value = []
    }

    selectedCategory.value = null
    await refreshMappings()
  } catch (error) {
    console.error('Failed to assign to category:', error)
  }
}

// Clear a specific object mapping
const clearMapping = async (mapping: CategoryMapping) => {
  try {
    await $revitMapperBinding?.clearObjectsCategoryAssignment(mapping.objectIds)
    await refreshMappings()
  } catch (error) {
    console.error('Failed to clear mapping:', error)
  }
}

// Clear all object mappings
const clearAllMappings = async () => {
  try {
    await $revitMapperBinding?.clearAllObjectsCategoryAssignments()
    await refreshMappings()
  } catch (error) {
    console.error('Failed to clear all mappings:', error)
  }
}

// Clear a specific layer mapping
const clearLayerMapping = async (layerMapping: LayerCategoryMapping) => {
  try {
    await $revitMapperBinding?.clearLayerCategoryAssignment(layerMapping.layerIds)
    await refreshMappings()
  } catch (error) {
    console.error('Failed to clear layer mapping:', error)
  }
}

// Clear all layer mappings
const clearAllLayerMappings = async () => {
  try {
    await $revitMapperBinding?.clearAllLayerCategoryAssignments()
    await refreshMappings()
  } catch (error) {
    console.error('Failed to clear all layer mappings:', error)
  }
}

// Select mapped objects in Rhino
const selectMappedObjects = async (mapping: CategoryMapping) => {
  try {
    await $baseBinding?.highlightObjects(mapping.objectIds)
  } catch (error) {
    console.error('Failed to highlight objects:', error)
  }
}

// Select mapped layers (highlight objects on those layers)
const selectMappedLayers = async (layerMapping: LayerCategoryMapping) => {
  try {
    const effectiveObjectIds =
      (await $revitMapperBinding?.getEffectiveObjectsForLayerMapping(
        layerMapping.layerIds,
        layerMapping.categoryValue
      )) || []

    if (effectiveObjectIds.length > 0) {
      await $baseBinding?.highlightObjects(effectiveObjectIds)
    }
  } catch (error) {
    console.error('Failed to highlight effective objects:', error)
  }
}

// Load available categories, layers, and current mappings
const loadData = async () => {
  try {
    const [categories, currentMappings, currentLayerMappings, layers] =
      await Promise.all([
        $revitMapperBinding?.getAvailableCategories() || [],
        $revitMapperBinding?.getCurrentObjectsMappings() || [],
        $revitMapperBinding?.getCurrentLayerMappings() || [],
        loadAvailableLayers()
      ])
    categoryOptions.value = categories
    mappings.value = currentMappings
    layerMappings.value = currentLayerMappings
    layerOptions.value = layers
  } catch (error) {
    console.error('Failed to load mapper data:', error)
  }
}

// Refresh both object and layer mappings
const refreshMappings = async () => {
  try {
    const [currentMappings, currentLayerMappings] = await Promise.all([
      $revitMapperBinding?.getCurrentObjectsMappings() || [],
      $revitMapperBinding?.getCurrentLayerMappings() || []
    ])
    mappings.value = currentMappings
    layerMappings.value = currentLayerMappings
  } catch (error) {
    console.error('Failed to refresh mappings:', error)
  }
}

// Load available layers from Rhino document
const loadAvailableLayers = async (): Promise<LayerOption[]> => {
  try {
    // Call the backend method to get available layers
    const layers = (await $revitMapperBinding?.getAvailableLayers()) || []
    return layers
  } catch (error) {
    console.error('Failed to load layers:', error)
    return []
  }
}

// Refresh just the layer mappings
const refreshLayerMappings = async () => {
  try {
    const currentLayerMappings =
      (await $revitMapperBinding?.getCurrentLayerMappings()) || []
    layerMappings.value = currentLayerMappings
  } catch (error) {
    console.error('Failed to refresh layer mappings:', error)
  }
}

// === LIFECYCLE ===
onMounted(() => {
  loadData()

  // Listen for mappings changes from backend
  $revitMapperBinding?.on('mappingsChanged', (newMappings: CategoryMapping[]) => {
    mappings.value = newMappings
    // Also refresh layer mappings when backend notifies of changes
    refreshLayerMappings()
  })

  // Listen for document changes to refresh layer list
  $baseBinding?.on('documentChanged', async () => {
    await loadData()
    selectedLayers.value = []
  })
})
</script>
