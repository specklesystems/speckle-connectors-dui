<template>
  <div class="p-0">
    <slot name="activator" :toggle="toggleDialog"></slot>
    <CommonDialog v-model:open="showIssuesDialog" :title="`Issues`" fullscreen="none">
      <div class="flex flex-col space-y-2">
        <div v-if="selectedIssue" class="flex flex-col space-y-1.5">
          <div class="relative flex items-center h-8">
            <div class="absolute left-0">
              <FormButton
                color="outline"
                hide-text
                :icon-left="ArrowLeft"
                @click="selectedIssue = undefined"
              />
            </div>

            <div class="mx-auto text-foreground-2 font-medium font-mono text-body-xs">
              {{ selectedIssue.identifier }}
            </div>
            <div class="absolute right-0">
              <FormButton
                v-tippy="'Open issue in browser'"
                color="outline"
                hide-text
                :icon-left="ArrowTopRightOnSquareIcon"
                @click="openIssueOnWeb(selectedIssue.id)"
              />
            </div>
          </div>
          <hr />
          <IssuesSelectedItem :issue="selectedIssue" />
        </div>

        <div v-if="!selectedIssue" class="flex flex-col space-y-2">
          <IssuesItem
            v-for="issue in issues"
            :key="issue.id"
            :issue="issue"
            :model-card="modelCard"
            @select="selectedIssue = issue"
            @open-on-web="(issueId) => openIssueOnWeb(issueId)"
          />
        </div>
      </div>
    </CommonDialog>
  </div>
</template>

<script setup lang="ts">
import type { IssuesItemFragment } from '~/lib/common/generated/gql/graphql'
import type { IModelCard } from '~/lib/models/card'
import { ArrowLeft } from 'lucide-vue-next'
import { ArrowTopRightOnSquareIcon } from '@heroicons/vue/24/solid'

const props = defineProps<{
  issues: IssuesItemFragment[]
  modelCard: IModelCard
}>()

const app = useNuxtApp()
const showIssuesDialog = ref(false)
const selectedIssue = ref<IssuesItemFragment | undefined>(undefined)

const toggleDialog = () => {
  showIssuesDialog.value = !showIssuesDialog.value
}

const openIssueOnWeb = (issueId: string) => {
  app.$baseBinding.openUrl(
    `${props.modelCard.serverUrl}/projects/${props.modelCard?.projectId}/models/${props.modelCard.modelId}#threadId=${issueId}`
  )
}

watch(showIssuesDialog, (open) => {
  if (!open) selectedIssue.value = undefined
})
</script>
