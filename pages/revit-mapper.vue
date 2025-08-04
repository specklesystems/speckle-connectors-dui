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
const { $revitMapperBinding, $baseBinding } = useNuxtApp()

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
const assignToCategory = async () => {
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

  await $revitMapperBinding?.assignToCategory(objectIds, selectedCategory.value.value)

  // Refresh mappings from backend to get real state
  await refreshMappings()

  // Reset selection
  selectedCategory.value = null

  console.log('Updated mappings:', mappings.value)
}

const refreshMappings = async () => {
  try {
    const currentMappings = (await $revitMapperBinding?.getCurrentMappings()) || []

    // Convert backend format to UI format
    mappings.value = currentMappings.map((mapping) => ({
      category: {
        value: mapping.categoryValue,
        label: mapping.categoryLabel
      },
      objectIds: [...mapping.objectIds],
      objectCount: mapping.objectCount
    }))
  } catch (error) {
    console.error('Failed to refresh mappings:', error)
  }
}

const selectMappedObjects = async (mapping: CategoryMapping) => {
  console.log('Selecting mapped objects:', mapping.objectIds)
  try {
    // Use basic connector binding to highlight objects
    await $baseBinding?.highlightObjects(mapping.objectIds)
  } catch (error) {
    console.error('Failed to highlight objects:', error)
  }
}

const clearMapping = async (mapping: CategoryMapping) => {
  console.log('Clearing mapping for category:', mapping.category.label)

  try {
    // Call binding to clear category assignment for these objects
    await $revitMapperBinding?.clearCategoryAssignment(mapping.objectIds)
    await refreshMappings()

    console.log('Successfully cleared mapping')
  } catch (error) {
    console.error('Failed to clear mapping:', error)
  }
}

const clearAllMappings = async () => {
  console.log('Clearing all mappings')

  try {
    // Call binding to clear all assignments
    await $revitMapperBinding?.clearAllCategoryAssignments()
    await refreshMappings()

    console.log('Successfully cleared all mappings')
  } catch (error) {
    console.error('Failed to clear all mappings:', error)
  }
}

const loadCategories = async () => {
  try {
    const categories = (await $revitMapperBinding?.getAvailableCategories()) || []

    // Convert backend format to UI format
    categoryOptions.value = categories.map((cat) => ({
      value: cat.value,
      label: cat.label
    }))

    console.log('Loaded categories from backend:', categoryOptions.value.length)
  } catch (error) {
    console.error('Failed to load categories:', error)
    categoryOptions.value = []
  }
}

// Initialize selection on mount
onMounted(async () => {
  await loadCategories()
  await refreshMappings()
  if (hasSelectionBinding.value) {
    selectionStore.refreshSelectionFromHostApp()
  }
})
</script>
