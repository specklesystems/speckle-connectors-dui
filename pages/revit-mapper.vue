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
        <!-- Flex layout with dropdown and apply button side by side -->
        <div class="flex space-x-2">
          <div class="flex-1">
            <FormSelectBase
              v-model="selectedCategory"
              name="categoryMapping"
              placeholder="Select a category"
              label="Target Category"
              fixed-height
              size="sm"
              :items="categoryOptions"
              :allow-unset="false"
              mount-menu-on-body
            >
              <template #something-selected="{ value }">
                <span class="text-primary text-base text-sm">
                  {{ Array.isArray(value) ? value[0]?.label : value.label }}
                </span>
              </template>
              <template #option="{ item }">
                <span class="text-base text-sm">{{ item.label }}</span>
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
            Apply
          </FormButton>
        </div>
      </div>
    </div>

    <hr v-if="hasObjectsSelected" />

    <!-- Step 3: Mappings Summary Table -->
    <div v-if="mappings.length > 0" class="px-2">
      <p class="h5">Current Mappings</p>
      <div class="space-y-2 my-2">
        <div
          v-for="mapping in mappings"
          :key="mapping.categoryValue"
          class="p-2 bg-foundation border rounded-lg"
        >
          <div class="flex justify-between items-center">
            <div>
              <div class="text-sm font-medium">{{ mapping.categoryLabel }}</div>
              <div class="text-xs text-foreground-2">
                {{ mapping.objectCount }} object{{
                  mapping.objectCount !== 1 ? 's' : ''
                }}
              </div>
            </div>
            <div class="flex space-x-2">
              <FormButton
                size="sm"
                color="outline"
                @click="selectMappedObjects(mapping)"
              >
                Select
              </FormButton>
              <FormButton size="sm" color="danger" @click="clearMapping(mapping)">
                Clear
              </FormButton>
            </div>
          </div>
        </div>

        <!-- Clear all button - keep original styling -->
        <FormButton color="outline" class="w-full mt-2" @click="clearAllMappings()">
          Clear All Mappings
        </FormButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// === IMPORTS ===
import { storeToRefs } from 'pinia'
import { ArrowLeftIcon } from '@heroicons/vue/20/solid'
import { useSelectionStore } from '~/store/selection'
import type {
  Category,
  CategoryMapping
} from '~/lib/bindings/definitions/IRevitMapperBinding'

// === STORE INTEGRATION ===
const selectionStore = useSelectionStore()
const { selectionInfo, hasBinding: hasSelectionBinding } = storeToRefs(selectionStore)
const { $revitMapperBinding, $baseBinding } = useNuxtApp()

// === REACTIVE STATE ===
const categoryOptions = ref<Category[]>([])
const selectedCategory = ref<Category | undefined>(undefined)
const mappings = ref<CategoryMapping[]>([])

// === COMPUTED ===
const hasObjectsSelected = computed(
  () => (selectionInfo.value?.selectedObjectIds?.length || 0) > 0
)

// === WATCHERS ===
watch(
  hasSelectionBinding,
  (newValue) => {
    if (newValue) {
      selectionStore.refreshSelectionFromHostApp()
    }
  },
  { immediate: true }
)

// === INITIALIZATION ===
const loadCategories = async () => {
  const categories = (await $revitMapperBinding?.getAvailableCategories()) || []
  categoryOptions.value = categories
}
const refreshMappings = async () => {
  const currentMappings = (await $revitMapperBinding?.getCurrentMappings()) || []
  mappings.value = currentMappings
}

// === CATEGORY ASSIGNMENT ===
const assignToCategory = async () => {
  if (!selectedCategory.value || !selectionInfo.value?.selectedObjectIds) {
    return
  }
  const objectIds = selectionInfo.value.selectedObjectIds
  await $revitMapperBinding?.assignToCategory(objectIds, selectedCategory.value.value)
  await refreshMappings()
  selectedCategory.value = undefined
}
// === CATEGORY CLEARING ===
const clearMapping = async (mapping: CategoryMapping) => {
  await $revitMapperBinding?.clearCategoryAssignment(mapping.objectIds)
  await refreshMappings()
}
const clearAllMappings = async () => {
  await $revitMapperBinding?.clearAllCategoryAssignments()
  await refreshMappings()
}

// === OBJECT SELECTION ===
const selectMappedObjects = async (mapping: CategoryMapping) => {
  await $baseBinding?.highlightObjects(mapping.objectIds)
}

// === LIFECYCLE ===
onMounted(async () => {
  $revitMapperBinding?.on('mappingsChanged', (updatedMappings: CategoryMapping[]) => {
    mappings.value = updatedMappings
  })
  await loadCategories()
  await refreshMappings()
  if (hasSelectionBinding.value) {
    selectionStore.refreshSelectionFromHostApp()
  }
})
</script>
