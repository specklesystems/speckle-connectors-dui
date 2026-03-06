import { computed } from 'vue'
import type {
  ISendFilter,
  SendFilterSelect,
  RevitCategoriesSendFilter,
  RevitViewsSendFilter
} from '~/lib/models/card/send'
import { ValidationHelpers } from '@speckle/ui-components'
import type { GenericValidateFunction } from 'vee-validate'

export const isSelectFilter = (f: ISendFilter): f is SendFilterSelect =>
  f.type === 'Select' || 'selectedItems' in f

export const isRevitCategoriesFilter = (
  f: ISendFilter
): f is RevitCategoriesSendFilter =>
  f.id === 'revitCategories' || f.id === 'archicadLayers'

export const isRevitViewsFilter = (f: ISendFilter): f is RevitViewsSendFilter =>
  f.id === 'revitViews'

export const isEmail = ValidationHelpers.isEmail

export const isOneOrMultipleEmails = ValidationHelpers.isOneOrMultipleEmails

export const isRequired = ValidationHelpers.isRequired

export const isSameAs = ValidationHelpers.isSameAs

export const isStringOfLength = ValidationHelpers.isStringOfLength

export const stringContains = ValidationHelpers.stringContains

export const isUrl = ValidationHelpers.isUrl

export const isItemSelected = ValidationHelpers.isItemSelected

const isValidModelName: GenericValidateFunction<string> = (name) => {
  name = name.trim()
  if (
    name.startsWith('/') ||
    name.endsWith('/') ||
    name.startsWith('#') ||
    name.startsWith('$') ||
    name.indexOf('//') !== -1 ||
    name.indexOf(',') !== -1
  )
    return 'Value should not start with "#", "$", start or end with "/", have multiple slashes next to each other or contain commas'

  if (['globals', 'main'].includes(name))
    return `'main' and 'globals' are reserved names`

  return true
}

export function useModelNameValidationRules() {
  return computed(() => [
    isRequired,
    isStringOfLength({ maxLength: 512 }),
    isValidModelName
  ])
}

export type FilterValidationResult = { valid: boolean; reason?: string }

export function validateFilter(
  filter: ISendFilter | undefined,
  context: { selectionCount: number }
): FilterValidationResult {
  if (!filter) return { valid: false, reason: 'No filter selected' }

  // Selection Filter check
  if (filter.name === 'Selection' || filter.id === 'selection') {
    return context.selectionCount > 0
      ? { valid: true }
      : { valid: false, reason: 'No objects selected to publish' }
  }

  // List-based filters (Rhino Layers, etc.)
  if (isSelectFilter(filter)) {
    return (filter.selectedItems?.length ?? 0) > 0
      ? { valid: true }
      : { valid: false, reason: 'No items selected to publish' }
  }

  // Category-based filters
  if (isRevitCategoriesFilter(filter)) {
    return (filter.selectedCategories?.length ?? 0) > 0
      ? { valid: true }
      : { valid: false, reason: 'No categories selected to publish' }
  }

  // View-based filters
  if (isRevitViewsFilter(filter)) {
    return filter.selectedView?.trim()
      ? { valid: true }
      : { valid: false, reason: 'No view selected to publish' }
  }

  return { valid: true }
}
