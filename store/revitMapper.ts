import { defineStore } from 'pinia'
import type { Category } from '~/lib/bindings/definitions/IRevitMapperBinding'
import { REVIT_CATEGORIES } from '~/lib/mapper/revit-categories'

export const useRevitMapper = defineStore('revitMapper', () => {
  const app = useNuxtApp()
  const { $revitMapperBinding } = app
  const currentCategories = ref<string[]>([])
  const selectedCategory = ref<Category | undefined>()
  const categoryOptions = REVIT_CATEGORIES

  const categoryStatus = computed(() => {
    console.log('categoryStatus', currentCategories.value)

    if (currentCategories.value.length === 0) {
      return undefined
    }

    if (currentCategories.value.length === 1) {
      const category = categoryOptions.find(
        (cat) => cat.value === currentCategories.value[0]
      )
      return category ? { label: category.label, value: category.value } : undefined
    }

    return {
      label: 'Multiple categories',
      value: 'multiple',
      isMultiple: true
    }
  })

  const updateFromTargets = async (
    targetIds: string[],
    isLayerMode: boolean
  ): Promise<void> => {
    if (!targetIds.length || !$revitMapperBinding) {
      clear()
      return
    }

    try {
      // Call connector method based on mode
      const categories = isLayerMode
        ? await $revitMapperBinding.getCategoryMappingsForLayers(targetIds)
        : await $revitMapperBinding.getCategoryMappingsForObjects(targetIds)

      console.log('categories', categories)

      currentCategories.value = categories

      // Update dropdown selection based on categories found
      if (categories.length === 1) {
        selectedCategory.value = categoryOptions.find(
          (cat) => cat.value === categories[0]
        )
      } else {
        // Multiple or no categories - clear dropdown selection
        selectedCategory.value = undefined
      }
    } catch (error) {
      console.error('Failed to get category mappings:', error)
      clear()
    }
  }

  const clear = () => {
    currentCategories.value = []
    selectedCategory.value = undefined
  }

  return {
    currentCategories,
    selectedCategory,
    categoryStatus,
    updateFromTargets,
    clear
  }
})
