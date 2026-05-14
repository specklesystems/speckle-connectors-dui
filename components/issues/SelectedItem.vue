<template>
  <div class="flex flex-col space-y-1.5">
    <div class="flex flex-col items-start space-y-2 p-2">
      <div class="line-clamp-2 font-medium text-body text-foreground">
        {{ issue.title ? issue.title : 'No title' }}
      </div>
      <IssuesBasicTiptap
        v-if="issue.description?.doc"
        class="border rounded-xl border-outline-3 w-full"
        :doc="issue.description?.doc"
      ></IssuesBasicTiptap>

      <div v-if="app.$parametersBinding && hasObjectDeltas" class="w-full pt-1 pb-1">
        <FormButton
          class="w-full justify-center"
          :disabled="isApplying || isResolved"
          @click="openConfirmDialog = true"
        >
          {{
            isApplying ? 'Applying...' : isResolved ? 'Issue resolved' : 'Apply changes'
          }}
        </FormButton>
      </div>
      <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
        <IssuesStatusIcon :status="issue.status" show-label />
        <IssuesPriorityIcon :priority="issue.priority" show-label />
        <div class="flex items-center justify-between space-x-1">
          <UserAvatar :user="issue.assignee?.user" size="xs" />
          <span class="text-body-3xs text-foreground-2 font-medium">
            {{ issue.assignee ? issue.assignee?.user.name : 'No assignee' }}
          </span>
        </div>
        <IssuesLabels :labels="issue.labels" />
        <div v-if="formattedDate" class="flex items-center gap-1 h-6">
          <Calendar class="text-foreground-2 shrink-0" :stroke-width="1.5" :size="12" />
          <span class="text-body-3xs text-foreground-2 font-medium">
            {{ formattedDate }}
          </span>
        </div>
        <div v-else class="flex items-center gap-1 h-6">
          <Calendar class="text-foreground-2 shrink-0" :stroke-width="1.5" :size="12" />
          <span class="text-body-3xs text-foreground-2 font-medium">No due date</span>
        </div>
      </div>
      <div
        v-if="issue.activities && issue.activities.totalCount > 0"
        class="flex items-center gap-2 p-1 min-w-0"
      >
        <UserAvatar
          :user="issue.activities?.items?.[0]?.actor?.user"
          size="xs"
          class="shrink-0"
        />

        <div class="text-body-2xs text-foreground-2 leading-tight min-w-0">
          <span class="font-medium">
            {{ issue.activities?.items?.[0]?.actor?.user.name }}
          </span>
          <span>
            &nbsp;created this issue &middot;
            {{ dayjs(issue.activities?.items?.[0].createdAt).from(dayjs()) }}
          </span>
        </div>
      </div>
      <div
        v-if="issue.replies && issue.replies.totalCount > 0"
        class="flex flex-col justify-between space-y-2 w-full"
      >
        <div
          v-for="reply in issue.replies.items"
          :key="reply.id"
          class="flex flex-col items-start border rounded-xl border-outline-3 p-1 w-full"
        >
          <div class="flex items-center gap-2 w-full">
            <UserAvatar :user="reply.author?.user" size="xs" class="shrink-0" />
            <div class="text-body-2xs text-foreground-2 leading-tight min-w-0">
              <span class="font-medium">
                {{ reply.author?.user.name }}
              </span>
              <span>
                &nbsp;replied &middot;
                {{ dayjs(reply.createdAt).from(dayjs()) }}
              </span>
            </div>
          </div>

          <IssuesBasicTiptap
            v-if="reply.description?.doc"
            class="ml-4"
            :doc="reply.description?.doc"
          />
        </div>
      </div>
    </div>

    <!--
      Apply change requests confirmation.
      This is a destructive action (deletes the record, resolves the issue,
      and is not transactional with the model write) so we gate it behind an
      explicit YES/NO before touching anything.
    -->
    <CommonDialog
      v-model:open="openConfirmDialog"
      title="Apply change requests"
      max-width="md"
      fullscreen="none"
    >
      <div class="mx-1">
        <p class="text-body-xs mb-2">
          Applying these change requests will update the model, close the linked issue
          and permanently delete the record of changes.
        </p>
        <p class="text-body-xs text-foreground-2">
          This cannot be undone. Do you want to continue?
        </p>
      </div>
      <template #buttons>
        <FormButton
          full-width
          size="sm"
          text
          :disabled="isApplying"
          @click="openConfirmDialog = false"
        >
          No
        </FormButton>
        <FormButton full-width size="sm" :disabled="isApplying" @click="confirmApply">
          {{ isApplying ? 'Applying...' : 'Yes' }}
        </FormButton>
      </template>
    </CommonDialog>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useQuery } from '@vue/apollo-composable'
import { ToastNotificationType } from '@speckle/ui-components'
import { ResourceMetaType, IssueStatus } from '~/lib/common/generated/gql/graphql'
import { issueResourceMetaSearchQuery } from '~/lib/issues/graphql/queries'
import { useApplyChangeRequests } from '~/lib/issues/composables/useApplyChangeRequests'
import { useHostAppStore } from '~/store/hostApp'
import type {
  IssuesItemFragment,
  IssueResourceMetaSearchQuery
} from '~/lib/common/generated/gql/graphql'
import type { IModelCard } from '~/lib/models/card'
import dayjs from 'dayjs'
import { Calendar } from 'lucide-vue-next'

const props = defineProps<{
  issue: IssuesItemFragment
  modelCard: IModelCard
}>()

const app = useNuxtApp()
const hostAppStore = useHostAppStore()
const { applyChangeRequests } = useApplyChangeRequests()

const isApplying = ref(false)
const openConfirmDialog = ref(false)

const isResolved = computed(() => {
  return props.issue.status === IssueStatus.Resolved
})

const queryVariables = computed(() => ({
  workspaceId: props.modelCard.workspaceId!,
  projectId: props.modelCard.projectId,
  resourceType: ResourceMetaType.Issue,
  resourceId: props.issue.id,
  metaType: 'objectDeltas'
}))

const queryOptions = computed(() => ({
  fetchPolicy: 'cache-and-network' as const,
  enabled: !!props.modelCard.workspaceId,
  clientId: props.modelCard.accountId
}))

const { result: resourceMetaResult } = useQuery(
  issueResourceMetaSearchQuery,
  queryVariables,
  queryOptions
)

const hasObjectDeltas = computed<boolean>(() => {
  const data = resourceMetaResult.value as IssueResourceMetaSearchQuery | undefined
  const metadata = data?.resourceMetaSearch
  return Array.isArray(metadata) && metadata.length > 0
})

const confirmApply = async () => {
  if (isApplying.value) return

  isApplying.value = true
  try {
    await applyChangeRequests(props.issue, props.modelCard)
    openConfirmDialog.value = false
    hostAppStore.setNotification({
      type: ToastNotificationType.Success,
      title: 'Change requests applied',
      description: 'The model has been updated and the issue resolved.'
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Failed to apply change requests:', error)
    hostAppStore.setNotification({
      type: ToastNotificationType.Danger,
      title: 'Failed to apply change requests',
      description: message
    })
  } finally {
    isApplying.value = false
  }
}

const formattedDate = computed((): string | null => {
  try {
    const date = props.issue.dueDate ? dayjs(props.issue.dueDate).toDate() : null

    if (!(date instanceof Date)) return null

    const time = date.getTime()
    if (isNaN(time)) return null

    return new Intl.DateTimeFormat('en-GB', {
      month: 'short',
      day: 'numeric'
    }).format(date)
  } catch {
    return null
  }
})
</script>
