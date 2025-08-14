import type { Ref } from 'vue'
import type {
  Category,
  IRevitMapperBinding
} from '~/lib/bindings/definitions/IRevitMapperBinding'

export interface RevitCategoryState {
  // Current categories found for selected targets
  currentCategories: Ref<string[]>

  // Category selected in the dropdown
  selectedCategory: Ref<Category | undefined>

  // Computed status for display
  categoryStatus: ComputedRef<{
    label: string
    value: string
    isMultiple?: boolean
  } | null>

  // Update state based on current targets
  updateFromTargets: (targetIds: string[], isLayerMode: boolean) => Promise<void>

  // Clear all state
  clear: () => void
}

export function useRevitCategoryState(
  categoryOptions: Ref<Category[]>,
  revitMapperBinding: IRevitMapperBinding | undefined
): RevitCategoryState {
  const currentCategories = ref<string[]>([])
  const selectedCategory = ref<Category | undefined>(undefined)

  const categoryStatus = computed(() => {
    if (currentCategories.value.length === 0) {
      return null
    }

    if (currentCategories.value.length === 1) {
      const category = categoryOptions.value.find(
        (cat) => cat.value === currentCategories.value[0]
      )
      return category ? { label: category.label, value: category.value } : null
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
    // Clear state if no targets
    if (!targetIds.length || !revitMapperBinding) {
      clear()
      return
    }

    try {
      // Call connector method based on mode
      const categories: string[] = isLayerMode
        ? await revitMapperBinding.getCategoryMappingsForLayers(targetIds)
        : await revitMapperBinding.getCategoryMappingsForObjects(targetIds)

      currentCategories.value = categories

      // Update dropdown selection based on categories found
      if (categories.length === 1) {
        selectedCategory.value = categoryOptions.value.find(
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
}
