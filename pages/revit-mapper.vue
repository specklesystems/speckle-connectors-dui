<template>
  <div class="flex flex-col space-y-2">
    <div class="px-2 mt-2">
      <FormButton to="/" size="sm" :icon-left="ArrowLeftIcon" class="my-2">
        Home
      </FormButton>
      <hr />
    </div>

    <!-- Step 1: Selection Mode (currently only support by selection) -->
    <div class="px-2">
      <p class="h5">Selection</p>
      <div class="space-y-2 my-2">
        <div class="space-y-2 p-2 bg-highlight-1 rounded-md text-body-xs">
          <div v-if="(selectionInfo?.selectedObjectIds?.length || 0) === 0">
            No objects selected, go ahead and select some from your model!
          </div>
          <div v-else>{{ selectionInfo?.summary }}</div>
        </div>
      </div>
    </div>

    <!-- Step 2: Category Selection (only shown when objects are selected) -->
    <div v-if="hasObjectsSelected" class="px-2">
      <p class="h5">Target Category</p>
      <div class="space-y-2 my-2">
        <FormSelectBase
          v-model="selectedCategory"
          name="categoryMapping"
          placeholder="Select a category"
          class="w-full"
          fixed-height
          size="sm"
          :items="categoryOptions"
          :allow-unset="false"
          mount-menu-on-body
          show-label
        >
          <template #something-selected="{ value }">
            <span class="text-primary text-base text-sm">{{ value.label }}</span>
          </template>
          <template #option="{ item }">
            <span class="text-base text-sm">{{ item.label }}</span>
          </template>
        </FormSelectBase>

        <!-- Action button -->
        <FormButton
          color="primary"
          class="w-full mt-2"
          :disabled="!selectedCategory"
          @click="assignToCategory()"
        >
          Apply Mapping
        </FormButton>
      </div>
    </div>

    <hr v-if="hasObjectsSelected" />

    <!-- Step 3: Mappings Summary Table -->
    <div v-if="mappings.length > 0" class="px-2">
      <p class="h5">Current Mappings</p>
      <div class="space-y-2 my-2">
        <div
          v-for="mapping in mappings"
          :key="mapping.category.value"
          class="p-3 bg-foundation border rounded-lg"
        >
          <div class="flex justify-between items-center">
            <div>
              <div class="text-sm font-medium">{{ mapping.category.label }}</div>
              <div class="text-xs text-foreground-2">
                {{ mapping.objectCount }} object{{
                  mapping.objectCount !== 1 ? 's' : ''
                }}
              </div>
            </div>
            <div class="flex space-x-2">
              <FormButton
                size="xs"
                color="outline"
                @click="selectMappedObjects(mapping)"
              >
                Select
              </FormButton>
              <FormButton size="xs" color="danger" @click="clearMapping(mapping)">
                Clear
              </FormButton>
            </div>
          </div>
        </div>

        <!-- Clear all button -->
        <FormButton color="outline" class="w-full mt-2" @click="clearAllMappings()">
          Clear All Mappings
        </FormButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { ArrowLeftIcon } from '@heroicons/vue/20/solid'
import { useSelectionStore } from '~/store/selection'

// Interfaces
interface Category {
  value: string
  label: string
}

interface CategoryMapping {
  category: Category
  objectIds: string[]
  objectCount: number
}

// Dynamic categories loaded from connector
const categoryOptions = ref<Category[]>([])

// Selection store integration
const selectionStore = useSelectionStore()
const { selectionInfo, hasBinding: hasSelectionBinding } = storeToRefs(selectionStore)

// Reactive state
const selectedCategory = ref<Category | null>(null)
const mappings = ref<CategoryMapping[]>([])

// Computed properties
const hasObjectsSelected = computed(
  () => (selectionInfo.value?.selectedObjectIds?.length || 0) > 0
)

// Watch for selection changes to refresh from host app
watch(
  hasSelectionBinding,
  (newValue) => {
    if (newValue) {
      selectionStore.refreshSelectionFromHostApp()
    }
  },
  { immediate: true }
)

// Functions for mapping management
const assignToCategory = () => {
  if (!selectedCategory.value || !selectionInfo.value?.selectedObjectIds) {
    console.warn('No category selected or no objects selected')
    return
  }

  const objectIds = selectionInfo.value.selectedObjectIds
  console.log('Assigning objects to category:', {
    category: selectedCategory.value,
    objectIds: objectIds,
    count: objectIds.length
  })

  // Find existing mapping or create new one
  const existingMappingIndex = mappings.value.findIndex(
    (m) => m.category.value === selectedCategory.value!.value
  )

  if (existingMappingIndex >= 0) {
    // Update existing mapping - merge object IDs
    const existingMapping = mappings.value[existingMappingIndex]
    const mergedObjectIds = [...new Set([...existingMapping.objectIds, ...objectIds])]
    mappings.value[existingMappingIndex] = {
      ...existingMapping,
      objectIds: mergedObjectIds,
      objectCount: mergedObjectIds.length
    }
  } else {
    // Create new mapping
    mappings.value.push({
      category: selectedCategory.value,
      objectIds: [...objectIds],
      objectCount: objectIds.length
    })
  }

  // TODO: Call binding to assign mapping to objects
  // await app.$mapperBinding?.assignToCategory(objectIds, selectedCategory.value.value)

  // Reset selection
  selectedCategory.value = null

  console.log('Updated mappings:', mappings.value)
}

const selectMappedObjects = (mapping: CategoryMapping) => {
  console.log('Selecting mapped objects:', mapping.objectIds)
  // TODO: Call binding to select these specific objects in Rhino
  // await app.$selectionBinding?.setSelection(mapping.objectIds)
}

const clearMapping = (mapping: CategoryMapping) => {
  console.log('Clearing mapping for category:', mapping.category.label)

  // Remove from mappings array
  const index = mappings.value.findIndex(
    (m) => m.category.value === mapping.category.value
  )
  if (index >= 0) {
    mappings.value.splice(index, 1)
  }

  // TODO: Call binding to clear category assignment for these objects
  // await app.$mapperBinding?.clearCategoryAssignment(mapping.objectIds)
}

const clearAllMappings = () => {
  console.log('Clearing all mappings')

  // Get all object IDs from all mappings
  const allObjectIds = mappings.value.flatMap((m) => m.objectIds)

  // Clear the mappings array
  mappings.value = []

  // TODO: Call binding to clear all category assignments
  // await app.$mapperBinding?.clearAllCategoryAssignments(allObjectIds)
}

// Initialize selection on mount
onMounted(() => {
  if (hasSelectionBinding.value) {
    selectionStore.refreshSelectionFromHostApp()
  }
})
</script>
