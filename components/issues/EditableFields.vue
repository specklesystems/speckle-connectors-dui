<template>
  <div class="grid grid-cols-2 gap-1.5 w-full">
    <FormSelectBase
      v-if="editability.status.editable"
      :model-value="statusDraft"
      name="issueStatus"
      label="Status"
      :items="statusOptions"
      by="id"
      size="sm"
      mount-menu-on-body
      :allow-unset="false"
      @update:model-value="onStatusChange"
    >
      <template #option="{ item }">
        <IssuesStatusIcon :status="item.id" show-label />
      </template>
      <template #something-selected="{ value }">
        <IssuesStatusIcon :status="singleValue(value).id" show-label />
      </template>
    </FormSelectBase>
    <IssuesStatusIcon
      v-else
      v-tippy="editability.status.reason"
      :status="issue.status"
      show-label
    />

    <FormSelectBase
      v-if="editability.priority.editable"
      :model-value="priorityDraft"
      name="issuePriority"
      label="Priority"
      :items="priorityOptions"
      by="id"
      size="sm"
      mount-menu-on-body
      :allow-unset="false"
      @update:model-value="onPriorityChange"
    >
      <template #option="{ item }">
        <IssuesPriorityIcon :priority="item.id" show-label />
      </template>
      <template #something-selected="{ value }">
        <IssuesPriorityIcon :priority="singleValue(value).id" show-label />
      </template>
    </FormSelectBase>
    <IssuesPriorityIcon
      v-else
      v-tippy="editability.priority.reason"
      :priority="issue.priority"
      show-label
    />

    <FormSelectBase
      v-if="editability.assignee.editable"
      :model-value="assigneeDraft"
      name="issueAssignee"
      label="Assignee"
      by="id"
      size="sm"
      search
      :get-search-results="searchAssignees"
      search-placeholder="Search people"
      mount-menu-on-body
      clearable
      @update:model-value="onAssigneeChange"
    >
      <template #nothing-selected>
        <span class="text-body-3xs text-foreground-2 font-medium">No assignee</span>
      </template>
      <template #option="{ item }">
        <span class="flex items-center gap-1.5 text-body-2xs">
          <UserAvatar :user="item.user" size="xs" />
          {{ item.user.name }}
        </span>
      </template>
      <template #something-selected="{ value }">
        <span class="flex items-center gap-1.5 min-w-0">
          <UserAvatar :user="singleValue(value).user" size="xs" />
          <span class="text-body-3xs text-foreground-2 font-medium truncate">
            {{ singleValue(value).user.name }}
          </span>
        </span>
      </template>
    </FormSelectBase>
    <div
      v-else
      v-tippy="editability.assignee.reason"
      class="flex items-center space-x-1"
    >
      <UserAvatar :user="issue.assignee?.user" size="xs" />
      <span class="text-body-3xs text-foreground-2 font-medium">
        {{ issue.assignee ? issue.assignee.user.name : 'No assignee' }}
      </span>
    </div>

    <FormSelectBase
      v-if="editability.labels.editable"
      v-model="labelsDraft"
      name="issueLabels"
      label="Labels"
      :items="labelOptions"
      by="id"
      multiple
      size="sm"
      search
      :filter-predicate="labelMatches"
      search-placeholder="Search labels"
      mount-menu-on-body
    >
      <template #nothing-selected>
        <span class="text-body-3xs text-foreground-2 font-medium">No labels</span>
      </template>
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
        <IssuesLabels :labels="Array.isArray(value) ? value : [value]" />
      </template>
    </FormSelectBase>
    <IssuesLabels v-else v-tippy="editability.labels.reason" :labels="issue.labels" />
  </div>
</template>

<script setup lang="ts">
import { useDebounceFn } from '@vueuse/core'
import { useQuery } from '@vue/apollo-composable'
import type { IssuesItemFragment } from '~/lib/common/generated/gql/graphql'
import {
  issueAssigneesQuery,
  issueEditPermissionsQuery,
  issueLabelsQuery
} from '~/lib/issues/graphql/queries'
import {
  createSerialSaver,
  fieldEditability,
  statusOptions,
  withCurrent
} from '~/lib/issues/edit'
import { priorityOptions } from '~/lib/issues/filters'
import { useUpdateIssue } from '~/lib/issues/composables/useUpdateIssue'
import type { IssueFieldChanges } from '~/lib/issues/composables/useUpdateIssue'
import type { IModelCard } from '~/lib/models/card'
import { useAccountStore } from '~/store/accounts'

type Issue = IssuesItemFragment
type Assignee = NonNullable<Issue['assignee']>
type Label = Omit<Issue['labels'][number], '__typename'>
type StatusOption = (typeof statusOptions)[number]
type PriorityOption = (typeof priorityOptions)[number]

const props = defineProps<{
  issue: Issue
  modelCard: IModelCard
}>()

const updateIssue = useUpdateIssue(props.modelCard)
const accountStore = useAccountStore()
const clientId = props.modelCard.accountId
const projectId = props.modelCard.projectId

const { result: permissionsResult } = useQuery(
  issueEditPermissionsQuery,
  () => ({ projectId, issueId: props.issue.id }),
  () => ({ clientId, fetchPolicy: 'cache-and-network' as const })
)
const editability = computed(() =>
  fieldEditability(permissionsResult.value?.project.issue?.permissions)
)

const { result: labelsResult } = useQuery(
  issueLabelsQuery,
  () => ({ projectId }),
  () => ({ clientId, enabled: editability.value.labels.editable })
)
const labelOptions = computed(() =>
  withCurrent<Label>(
    labelsResult.value?.project.issueLabels.items ?? [],
    props.issue.labels
  )
)
const labelMatches = (label: Label, search: string) =>
  label.name.toLowerCase().includes(search.toLowerCase())

const searchAssignees = async (search: string) => {
  const current = props.issue.assignee ? [props.issue.assignee] : []
  try {
    const { data } = await accountStore.getAccountClient(clientId).query({
      query: issueAssigneesQuery,
      variables: { projectId, search: search || undefined }
    })
    return withCurrent<Assignee>(data.project.allowedIssueAssignees.items, current)
  } catch (error) {
    console.warn('Could not load assignees:', error)
    return current
  }
}

const singleValue = <T>(value: T | T[]) => (Array.isArray(value) ? value[0] : value)
const statusOf = (issue: Issue) => statusOptions.find((o) => o.id === issue.status)
const priorityOf = (issue: Issue) =>
  priorityOptions.find((o) => o.id === issue.priority)

const statusDraft = ref(statusOf(props.issue))
const priorityDraft = ref(priorityOf(props.issue))
const assigneeDraft = ref<Assignee | undefined>(props.issue.assignee ?? undefined)
const labelsDraft = ref<Label[]>([...props.issue.labels])

let labelSaveQueued = false
let labelSavesInFlight = 0

watch(
  () => props.issue,
  (issue) => {
    statusDraft.value = statusOf(issue)
    priorityDraft.value = priorityOf(issue)
    assigneeDraft.value = issue.assignee ?? undefined
    if (!labelSaveQueued && !labelSavesInFlight) labelsDraft.value = [...issue.labels]
  }
)

const saveField = async <T>(
  draft: Ref<T>,
  next: T,
  changes: IssueFieldChanges,
  saved: () => T
) => {
  draft.value = next
  if (!(await updateIssue(props.issue.id, changes))) draft.value = saved()
}

const onStatusChange = (value: StatusOption | StatusOption[] | undefined) => {
  const next = value && singleValue(value)
  if (!next || next.id === props.issue.status) return
  void saveField(statusDraft, next, { status: next.id }, () => statusOf(props.issue))
}

const onPriorityChange = (value: PriorityOption | PriorityOption[] | undefined) => {
  const next = value && singleValue(value)
  if (!next || next.id === props.issue.priority) return
  void saveField(priorityDraft, next, { priority: next.id }, () =>
    priorityOf(props.issue)
  )
}

const onAssigneeChange = (value: Assignee | Assignee[] | undefined) => {
  const next = value ? singleValue(value) : undefined
  if (next?.id === props.issue.assignee?.id) return
  void saveField(
    assigneeDraft,
    next,
    { assigneeId: next?.id ?? null },
    () => props.issue.assignee ?? undefined
  )
}

const saveLabels = createSerialSaver(async (labelIds: string[]) => {
  labelSavesInFlight++
  try {
    if (!(await updateIssue(props.issue.id, { labelIds }))) {
      labelsDraft.value = [...props.issue.labels]
    }
  } finally {
    labelSavesInFlight--
  }
})
const saveLabelsSoon = useDebounceFn(() => {
  labelSaveQueued = false
  return saveLabels(labelsDraft.value.map((l) => l.id))
}, 600)
watch(labelsDraft, (labels) => {
  const ids = labels.map((l) => l.id).sort()
  const saved = props.issue.labels.map((l) => l.id).sort()
  if (ids.join() === saved.join()) return
  labelSaveQueued = true
  void saveLabelsSoon()
})
</script>
