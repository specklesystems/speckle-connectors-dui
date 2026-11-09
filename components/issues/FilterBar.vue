<template>
  <div class="flex flex-col space-y-1.5">
    <div class="flex items-center gap-1 flex-wrap">
      <template v-if="meId">
        <FormButton
          size="sm"
          :color="isMine ? 'primary' : 'subtle'"
          @click="setAssignee(meId)"
        >
          Mine
        </FormButton>
        <FormButton
          size="sm"
          :color="isMine ? 'subtle' : 'primary'"
          @click="setAssignee(undefined)"
        >
          Everyone
        </FormButton>
      </template>
      <template v-if="kindsAvailable">
        <div class="w-px h-4 bg-outline-3 mx-1" />
        <FormButton
          v-for="option in kindButtons"
          :key="option.id"
          v-tippy="
            kindsLoading && option.id !== 'all'
              ? 'Checking for parameter updates'
              : undefined
          "
          size="sm"
          :color="kind === option.id ? 'primary' : 'subtle'"
          :disabled="kindsLoading && option.id !== 'all'"
          @click="setKind(option.id)"
        >
          {{ option.name }}
        </FormButton>
      </template>
      <div class="grow" />
      <FormButton
        v-tippy="extraCount ? `More filters (${extraCount} active)` : 'More filters'"
        size="sm"
        :color="extraCount ? 'primary' : 'subtle'"
        hide-text
        :icon-left="AdjustmentsHorizontalIcon"
        @click="showMore = !showMore"
      />
    </div>

    <div class="flex items-center gap-1 flex-wrap">
      <FormButton
        v-for="tab in statusTabs"
        :key="tab.id"
        size="sm"
        :color="activeTab === tab.id ? 'primary' : 'subtle'"
        @click="setStatuses(tab.statuses)"
      >
        {{ tab.name }}
        <span class="tabular-nums opacity-70 ml-0.5">{{ statusCounts[tab.id] }}</span>
      </FormButton>
    </div>

    <div
      v-if="showMore"
      class="flex flex-col space-y-2 border rounded-xl border-outline-3 p-2"
    >
      <FormSelectBase
        v-model="selectedPriorities"
        name="issuePriorityFilter"
        label="Priority"
        :items="priorityOptions"
        by="id"
        multiple
        size="sm"
        fixed-height
        mount-menu-on-body
        clearable
        placeholder="Any priority"
      >
        <template #option="{ item }">
          <span class="flex items-center gap-1.5 text-body-2xs">
            <IssuesPriorityIcon :priority="item.id" />
            {{ item.name }}
          </span>
        </template>
        <template #something-selected="{ value }">
          <span class="text-primary text-body-2xs">
            {{ namesOf(value) }}
          </span>
        </template>
      </FormSelectBase>
      <FormSelectBase
        v-if="labelOptions.length"
        v-model="selectedLabels"
        name="issueLabelFilter"
        label="Labels"
        :items="labelOptions"
        by="id"
        multiple
        size="sm"
        fixed-height
        mount-menu-on-body
        clearable
        placeholder="Any label"
      >
        <template #option="{ item }">
          <span class="flex items-center gap-1.5 text-body-2xs">
            <span
              class="w-2 h-2 rounded-full shrink-0"
              :style="{ backgroundColor: item.hexColor }"
            />
            {{ item.name }}
          </span>
        </template>
        <template #something-selected="{ value }">
          <span class="text-primary text-body-2xs">
            {{ namesOf(value) }}
          </span>
        </template>
      </FormSelectBase>
      <FormSwitch
        v-model="overdue"
        name="issueOverdueFilter"
        label="Overdue only"
        show-label
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { AdjustmentsHorizontalIcon } from '@heroicons/vue/24/outline'
import type { IssueStatus } from '~/lib/common/generated/gql/graphql'
import {
  activeStatusTabId,
  priorityOptions,
  statusTabs,
  type IssueFilters,
  type IssueKind
} from '~/lib/issues/filters'

const filters = defineModel<IssueFilters>({ required: true })

const props = defineProps<{
  meId?: string
  statusCounts: Record<string, number>
  labelOptions: { id: string; name: string; hexColor: string }[]
  kindsAvailable: boolean
  kindsLoading: boolean
}>()

const showMore = ref(false)

const patch = (next: Partial<IssueFilters>) => {
  filters.value = { ...filters.value, ...next }
}

const isMine = computed(
  () => !!props.meId && filters.value.assigneeIds.includes(props.meId)
)
const setAssignee = (id: string | undefined) => patch({ assigneeIds: id ? [id] : [] })

const kindButtons: { id: 'all' | IssueKind; name: string }[] = [
  { id: 'all', name: 'All' },
  { id: 'issue', name: 'Issues' },
  { id: 'parameterUpdate', name: 'Params' }
]
const kind = computed(() =>
  filters.value.kinds.length === 1 ? filters.value.kinds[0] : 'all'
)
const setKind = (id: 'all' | IssueKind) => patch({ kinds: id === 'all' ? [] : [id] })

const activeTab = computed(() => activeStatusTabId(filters.value))
const setStatuses = (statuses: IssueStatus[]) => patch({ statuses: [...statuses] })

const selectedPriorities = computed({
  get: () => priorityOptions.filter((o) => filters.value.priorities.includes(o.id)),
  set: (items: typeof priorityOptions) => patch({ priorities: items.map((i) => i.id) })
})
const selectedLabels = computed({
  get: () => props.labelOptions.filter((o) => filters.value.labelIds.includes(o.id)),
  set: (items: typeof props.labelOptions) => patch({ labelIds: items.map((i) => i.id) })
})
const overdue = computed({
  get: () => filters.value.overdue,
  set: (value: boolean) => patch({ overdue: value })
})

const extraCount = computed(
  () =>
    filters.value.priorities.length +
    filters.value.labelIds.length +
    (filters.value.overdue ? 1 : 0)
)

const namesOf = (value: unknown) =>
  (Array.isArray(value) ? (value as { name: string }[]) : [])
    .map((v) => v.name)
    .join(', ')
</script>
