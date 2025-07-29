<template>
  <div class="flex flex-col space-y-2">
    <div class="px-2 mt-2">
      <FormButton to="/" size="sm" :icon-left="ArrowLeftIcon" class="my-2">
        Home
      </FormButton>
      <hr />
    </div>
    <hr />
    <div class="px-2">
      <p class="h5">Category</p>
      <div class="space-y-2 my-2">
        <div
          v-for="category in availableCategories"
          :key="category.value"
          class="p-2 bg-foundation border rounded-lg cursor-pointer hover:bg-highlight-1 transition"
          @click="selectCategory(category)"
        >
          <div class="flex justify-between items-center">
            <span class="text-sm font-medium">{{ category.label }}</span>
            <span class="text-xs text-foreground-2">
              {{ category.objectCount }} objects in category
            </span>
          </div>
        </div>
      </div>
      <div class="flex space-x-2">
        <FormButton color="outline" class="flex-1" @click="assignToCategory()">
          Assign to Category
        </FormButton>
        <FormButton color="outline" class="flex-1" @click="clearAllAssignments()">
          Clear all assignments
        </FormButton>
      </div>
    </div>
    <hr />
    <div class="px-2">
      <p class="h5">Selected Filter</p>
      <div class="space-y-2 my-2">
        <div class="p-3 bg-primary/10 border border-primary/20 rounded-lg">
          <div class="text-sm text-primary font-medium">
            {{ selectionInfo?.objectIds?.length || 0 }} objects selected.
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { ArrowLeftIcon } from '@heroicons/vue/20/solid'
import { useSelectionStore } from '~/store/selection'

// BuiltInCategory data structure
interface Category {
  value: string
  label: string
  objectCount: number
}

// Hardcoded categories (for now)
const availableCategories: Category[] = [
  { value: 'OST_Columns', label: 'OST_Columns', objectCount: 0 },
  { value: 'OST_CurtainGrids', label: 'OST_CurtainGrids', objectCount: 0 },
  { value: 'OST_Floors', label: 'OST_Floors', objectCount: 0 },
  { value: 'OST_Furniture', label: 'OST_Furniture', objectCount: 0 },
  { value: 'OST_Walls', label: 'OST_Walls', objectCount: 0 }
]

// Selection store integration
const selectionStore = useSelectionStore()
const { selectionInfo, hasBinding: hasSelectionBinding } = storeToRefs(selectionStore)

// Category selection function
const selectCategory = (category: Category) => {
  console.log('Selected category:', category.label)
  console.log('Objects in category:', category.objectCount)
  // TODO: Call binding to select objects assigned to this category
}

// Object mapping function
const assignToCategory = () => {
  console.log('Assign to category clicked')
  console.log('Selected objects:', selectionInfo.value?.objectIds || [])
  // TODO: Show category picker, then call binding to assign
}

// Clear mapping function
const clearAllAssignments = () => {
  console.log('Clear assignments clicked')
  console.log('Selected objects:', selectionInfo.value?.objectIds || [])
  // TODO: Call binding to clear assignments
}
</script>
