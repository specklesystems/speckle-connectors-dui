<template>
  <div>
    <div class="text-foreground-2 text-body-2xs mb-1 pl-1">
      {{ control.label }}
    </div>
    <div class="flex items-center space-x-2 min-w-72">
      <FormSelectMulti
        :model-value="modelValue"
        :name="fieldName"
        :rules="multiValidator"
        :label="control.label"
        :items="control.options"
        class="flex-1 min-w-0"
        clearable
        :search="true"
        :search-placeholder="'Search'"
        :filter-predicate="searchFilterPredicate"
        :help="control.description"
        :allow-unset="false"
        by="value"
        button-style="tinted"
        :validate-on-value-update="validateOnValueUpdate"
        mount-menu-on-body
        fixed-height
        @update:model-value="handleChange"
      >
        <template #nothing-selected>
          {{
            appliedOptions['placeholder']
              ? appliedOptions['placeholder']
              : 'Select values'
          }}
        </template>
        <template #something-selected="{ value }">
          <div ref="elementToWatchForChanges" class="flex items-center space-x-0.5">
            <div ref="itemContainer" class="flex flex-wrap overflow-hidden space-x-0.5">
              <div v-for="(item, i) in value" :key="item.value" class="text-foreground">
                {{ item.label + (i < value.length - 1 ? ', ' : '') }}
              </div>
            </div>
            <div v-if="hiddenSelectedItemCount > 0" class="text-foreground-2 normal">
              +{{ hiddenSelectedItemCount }}
            </div>
          </div>
        </template>
        <template #option="{ item }">
          <div class="flex items-center text-foreground-2 text-body-2xs">
            <span class="truncate">{{ item.label }}</span>
          </div>
        </template>
      </FormSelectMulti>

      <!-- Select All / Deselect All button - positioned next to dropdown like Revit -->
      <FormButton color="outline" size="sm" class="min-w-20" @click="toggleSelectAll">
        {{ allSelected ? 'Deselect all' : 'Select all' }}
      </FormButton>
    </div>
  </div>
</template>
<script setup lang="ts">
import type { ControlElement } from '@jsonforms/core'
import { rendererProps, useJsonFormsEnumControl } from '@jsonforms/vue'
import type { Nullable } from '@speckle/shared'
import { useFormSelectChildInternals } from '@speckle/ui-components'
import type { GenericValidateFunction } from 'vee-validate'
import { useJsonRendererBaseSetup } from '~/lib/form/composables/jsonRenderers'

type OptionType = { value: string; label: string }
type ValueType = OptionType | OptionType[] | undefined

const emit = defineEmits<(e: 'update:modelValue', v: ValueType) => void>()

const props = defineProps({
  ...rendererProps<ControlElement>(),
  // TODO: Doesn't appear that jsonforms properly supports multiple selection
  multiple: {
    type: Boolean,
    default: true
  },
  controlOverrides: {
    type: Object as PropType<Nullable<ReturnType<typeof useJsonFormsEnumControl>>>,
    default: null
  }
})

const searchFilterPredicate = (item: OptionType, search: string) =>
  item.label.toLocaleLowerCase().includes(search.toLocaleLowerCase())

const elementToWatchForChanges = ref(null as Nullable<HTMLElement>)
const itemContainer = ref(null as Nullable<HTMLElement>)

const { hiddenSelectedItemCount, isArrayValue } =
  useFormSelectChildInternals<OptionType>({
    props: toRefs(props),
    emit,
    dynamicVisibility: { elementToWatchForChanges, itemContainer }
  })

/* eslint-disable @typescript-eslint/no-explicit-any */
const multiValidator: GenericValidateFunction<any> = () => true // ignoring validation for multi enum since it is custom and jsonforms does not support it properly

const { handleChange, control, appliedOptions, fieldName, validateOnValueUpdate } =
  useJsonRendererBaseSetup(props.controlOverrides || useJsonFormsEnumControl(props), {
    onChangeValueConverter: (newVal: ValueType) => {
      if (props.multiple && isArrayValue(newVal)) {
        return newVal.map((v) => v.value)
      } else if (newVal && !props.multiple && !isArrayValue(newVal)) {
        return newVal.value
      } else {
        return undefined
      }
    }
  })

const modelValue = computed(() => {
  const val = control.value.data as OptionType[]
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  return control.value.options.filter((o) => val?.includes(o.value))
})

/**
 * Computed property to check if all available options are selected.
 */
const allSelected = computed(() => {
  const currentSelection = modelValue.value || []
  const allOptions = control.value.options || []
  return currentSelection.length === allOptions.length && allOptions.length > 0
})

/**
 * Toggle between selecting all categories and clearing all selections.
 */
const toggleSelectAll = () => {
  if (allSelected.value) {
    // deselect all -> pass empty array
    handleChange([])
  } else {
    // select all available options
    const allOptions = control.value.options || []
    handleChange(allOptions)
  }
}
</script>
