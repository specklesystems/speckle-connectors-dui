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
    </div>
  </div>
</template>

<script setup lang="ts">
import { ArrowLeftIcon } from '@heroicons/vue/20/solid'

// Interface for category
interface Category {
  value: string
  label: string
  objectCount: number
}

// Hardcoded categories for now
const availableCategories: Category[] = [
  { value: 'OST_Walls', label: 'OST_Walls', objectCount: 0 },
  { value: 'OST_Floors', label: 'OST_Floors', objectCount: 0 }
]

// Click handler / logging
const selectCategory = (category: Category) => {
  console.log('Selected category:', category.label)
  console.log('Objects in category:', category.objectCount)
}
</script>
