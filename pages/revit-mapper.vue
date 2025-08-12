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
            v-model="selectedMappingMode"
            name="mappingMode"
            label="Mapping mode"
            class="w-full"
            fixed-height
            size="sm"
            :items="mappingModeOptions"
            :allow-unset="false"
            mount-menu-on-body
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

        <div v-if="selectedMappingMode === 'Layer'">
          <div class="space-y-2 p-2 bg-highlight-1 rounded-md text-body-xs">
            <!-- TODO: Implement layer selection interface -->
            <div class="text-foreground-2">TODO: Layer selection interface ...</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Step 2: Category Selection -->
    <div v-if="hasTargetsSelected" class="px-2">
      <p class="h5">Target Category</p>
      <div class="space-y-2 my-2">
        <!-- Flex layout with dropdown and apply button side by side -->
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
                  {{ Array.isArray(value) ? value[0]?.label : value.label }}
                </span>
              </template>
              <template #option="{ item }">
                <span class="text-xs">{{ item.label }}</span>
              </template>
            </FormSelectBase>
          </div>

          <!-- Apply button - same height as dropdown -->
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

    <!-- Step 3: Mappings Summary Table -->
    <div v-if="mappings.length > 0" class="px-2">
      <p class="h5">Current Mappings</p>

      <!-- Only mapping items get space-y -->
      <div class="space-y-1 my-2">
        <div
          v-for="mapping in mappings"
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

      <!-- Clear all button separated, with custom margin -->
      <div class="flex justify-end">
        <FormButton size="sm" color="danger" @click="clearAllMappings()">
          Clear All
        </FormButton>
      </div>
    </div>
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
  CategoryMapping
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

// === COMPUTED ===
const hasTargetsSelected = computed(() => {
  if (selectedMappingMode.value === 'Selection') {
    return (selectionInfo.value?.selectedObjectIds?.length || 0) > 0
  }
  // TODO: Add layer selection check when implemented
  return false
})

// === METHODS ===
const app = useNuxtApp()
const { $revitMapperBinding, $baseBinding } = app

// Search predicate for category dropdown
const searchFilterPredicate = (item: Category, query: string) => {
  return item.label.toLowerCase().includes(query.toLowerCase())
}

// Assign selected objects to the chosen category
const assignToCategory = async () => {
  if (!selectedCategory.value || !hasTargetsSelected.value) return

  try {
    if (selectedMappingMode.value === 'Selection') {
      await $revitMapperBinding?.assignObjectsToCategory(
        selectionInfo.value?.selectedObjectIds || [],
        selectedCategory.value.value
      )
    }
    // TODO: Add layer assignment when layer selection is implemented

    selectedCategory.value = null
    await refreshMappings()
  } catch (error) {
    console.error('Failed to assign to category:', error)
  }
}

// Clear a specific mapping
const clearMapping = async (mapping: CategoryMapping) => {
  try {
    await $revitMapperBinding?.clearObjectsCategoryAssignment(mapping.objectIds)
    await refreshMappings()
  } catch (error) {
    console.error('Failed to clear mapping:', error)
  }
}

// Clear all mappings
const clearAllMappings = async () => {
  try {
    await $revitMapperBinding?.clearAllObjectsCategoryAssignments()
    await refreshMappings()
  } catch (error) {
    console.error('Failed to clear all mappings:', error)
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

// Load available categories and current mappings
const loadData = async () => {
  try {
    const [categories, currentMappings] = await Promise.all([
      $revitMapperBinding?.getAvailableCategories() || [],
      $revitMapperBinding?.getCurrentObjectsMappings() || []
    ])
    categoryOptions.value = categories
    mappings.value = currentMappings
  } catch (error) {
    console.error('Failed to load mapper data:', error)
  }
}

// Refresh just the mappings
const refreshMappings = async () => {
  try {
    const currentMappings =
      (await $revitMapperBinding?.getCurrentObjectsMappings()) || []
    mappings.value = currentMappings
  } catch (error) {
    console.error('Failed to refresh mappings:', error)
  }
}

// === LIFECYCLE ===
onMounted(() => {
  loadData()

  // Listen for mappings changes from backend with null safety
  $revitMapperBinding?.on('mappingsChanged', (newMappings: CategoryMapping[]) => {
    mappings.value = newMappings
  })
})
</script>
