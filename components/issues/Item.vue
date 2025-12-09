<template>
  <button
    class="gap-1 border rounded-xl border-outline-3 p-1.5 pt-1 pl-3 group hover:shadow-md hover:cursor-pointer space-y-2"
    @click="emit('select'), highlightModel()"
  >
    <!-- Item Header -->
    <div class="flex justify-between items-center">
      <div class="text-foreground-2 font-medium font-mono text-body-xs">
        {{ issue.identifier }}
      </div>
      <div class="flex items-center">
        <FormButton
          v-if="store.hostAppName !== 'navisworks' && store.hostAppName !== 'etabs'"
          v-tippy="'Highlight'"
          color="subtle"
          :icon-left="CursorArrowRaysIcon"
          hide-text
          size="sm"
          @click.stop="highlightModel"
        />
        <FormButton
          v-tippy="'Open issue in browser'"
          color="subtle"
          :icon-left="ArrowTopRightOnSquareIcon"
          hide-text
          size="sm"
          class="mr-1"
          @click.stop="emit('open-on-web', issue.id)"
        />
        <UserAvatar :user="issue.assignee?.user" size="xs" class="rounded-full" />
      </div>
    </div>
    <!-- Item Title & status -->
    <div class="flex items-center gap-1">
      <IssuesStatusIcon :status="issue.status" />
      <div class="line-clamp-2 font-medium text-body-2xs text-foreground">
        {{ issue.title ? issue.title : 'No title' }}
      </div>
    </div>
    <!-- Remaining secondary fields -->
    <div class="flex items-center gap-4 ml-0.5">
      <IssuesPriorityIcon :priority="issue.priority" />
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
  </button>
</template>

<script lang="ts" setup>
import type { IssuesItemFragment } from '~/lib/common/generated/gql/graphql'
import { CursorArrowRaysIcon } from '@heroicons/vue/24/outline'
import { Calendar } from 'lucide-vue-next'
import dayjs from 'dayjs'
import { useHostAppStore } from '~~/store/hostApp'
import { ToastNotificationType } from '@speckle/ui-components'
import type { IModelCard } from '~/lib/models/card'
import type { SenderModelCard } from '~/lib/models/card/send'
import { ArrowTopRightOnSquareIcon } from '@heroicons/vue/24/solid'

const store = useHostAppStore()

const props = defineProps<{
  modelCard: IModelCard
  issue: IssuesItemFragment
}>()

const emit = defineEmits<{
  (e: 'select'): void
  (e: 'open-on-web', issueId: string): void
}>()

const app = useNuxtApp()

const highlightModel = async () => {
  if (props.issue.viewerState) {
    if (props.modelCard.typeDiscriminator === 'SenderModelCard') {
      const sender = props.modelCard as SenderModelCard
      const selectedObjectApplicationIds =
        (Object.values(
          props.issue.viewerState.ui.filters.selectedObjectApplicationIds
        ) as string[]) || []
      const appIdsToHighlight = (sender.sendFilter?.selectedObjectIds || []).filter(
        (id) => selectedObjectApplicationIds.includes(id)
      )
      if (appIdsToHighlight.length > 0) {
        await app.$baseBinding.highlightObjects(appIdsToHighlight)
      } else {
        store.setNotification({
          title: 'Objects not found to highlight on this model.',
          type: ToastNotificationType.Info
        })
      }
    }
  } else {
    store.setNotification({
      title: 'Objects not found to highlight',
      type: ToastNotificationType.Info
    })
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
