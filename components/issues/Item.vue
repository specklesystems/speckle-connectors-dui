<template>
  <div
    class="flex flex-col gap-2.5 border rounded-xl border-outline-3 p-1.5 pt-1 pl-3 group"
    v-on="{ click: onClick }"
  >
    <!-- Item Header -->
    <div class="flex justify-between items-center">
      <div class="text-foreground-2 font-medium font-mono text-body-xs">
        #{{ issue.identifier }}
      </div>
      <div class="flex gap-2 items-center">
        <!-- <FormSelectIssueAssignee
          :model-value="issue.assignee?.user.id"
          :project-id="projectId"
          :users="issue.assignee?.user ? [issue.assignee.user] : undefined"
          name="assignee"
          read-only
        /> -->
      </div>
    </div>
    <!-- Item Title & status -->
    <div class="flex items-start gap-1">
      <!-- <FormStatus :model-value="issue.status" name="status" read-only /> -->
      <div class="line-clamp-2 font-medium text-body-2xs text-foreground">
        {{ issue.title }}
      </div>
    </div>
    <!-- Remaining secondary fields -->
    <!-- <div class="flex items-center gap-4 ml-0.5">
      <FormPriority :model-value="issue.priority" name="priority" read-only />
      <FormSelectIssueLabels
        v-if="false"
        :model-value="[]"
        :project-id="projectId"
        :issue-id="issue.id"
        read-only
        name="labels"
      />
      <FormDate
        v-if="issue.dueDate"
        :model-value="dayjs(issue.dueDate).toDate()"
        read-only
        name="dueDate"
      />
    </div> -->
  </div>
</template>

<script lang="ts" setup>
import type { IssuesItemFragment } from '~/lib/common/generated/gql/graphql'
import dayjs from 'dayjs'

const props = defineProps<{
  projectId: string
  issue: IssuesItemFragment
}>()

const app = useNuxtApp()
const onClick = async () => {
  console.log(
    Object.values(props.issue.viewerState.ui.filters.selectedObjectApplicationIds)
  )
  await app.$baseBinding.highlightObjects(
    Object.values(props.issue.viewerState.ui.filters.selectedObjectApplicationIds)
  )
}
</script>
