<template>
  <div class="flex flex-col space-y-1.5">
    <div class="flex flex-col items-start space-y-2 p-2">
      <div class="line-clamp-2 font-medium text-body text-foreground">
        {{ issue.title ? issue.title : 'No title' }}
      </div>
      <IssuesBasicTiptap
        v-if="issue.description?.doc"
        class="border rounded-xl border-outline-3"
        :doc="issue.description?.doc"
      ></IssuesBasicTiptap>
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
  </div>
</template>

<script setup lang="ts">
import type { IssuesItemFragment } from '~/lib/common/generated/gql/graphql'
import dayjs from 'dayjs'
import { Calendar } from 'lucide-vue-next'

const props = defineProps<{
  issue: IssuesItemFragment
}>()

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
