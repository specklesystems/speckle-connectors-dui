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
                @click="selectedIssueId = undefined"
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
          <IssuesSelectedItem :issue="selectedIssue" :model-card="modelCard" />
        </div>

        <div v-if="!selectedIssue" class="flex flex-col space-y-2">
          <IssuesFilterBar
            v-model="filters"
            :me-id="meId"
            :status-counts="statusCounts"
            :label-options="labelOptions"
          />
          <div
            v-if="filteredIssues.length === 0"
            class="flex flex-col items-center space-y-2 py-4 text-body-2xs text-foreground-2"
          >
            <span>No issues match these filters.</span>
            <div class="flex gap-1">
              <FormButton
                v-if="filters.assigneeIds.length"
                size="sm"
                color="outline"
                @click="filters = { ...filters, assigneeIds: [] }"
              >
                Show everyone
              </FormButton>
              <FormButton size="sm" color="subtle" @click="resetFilters">
                Reset filters
              </FormButton>
            </div>
          </div>
          <IssuesItem
            v-for="issue in filteredIssues"
            :key="issue.id"
            :issue="issue"
            :model-card="modelCard"
            @select="selectedIssueId = issue.id"
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
import {
  applyIssueFilters,
  countStatusTabs,
  defaultIssueFilters,
  labelOptionsOf,
  withLateMeId,
  type IssueFilters
} from '~/lib/issues/filters'

const props = defineProps<{
  issues: IssuesItemFragment[]
  modelCard: IModelCard
  meId?: string
}>()

const app = useNuxtApp()
const showIssuesDialog = ref(false)
// FEA-775: hold the id and read the issue from the live list, so edits made
// in the detail view show there once the cache updates.
const selectedIssueId = ref<string>()
const selectedIssue = computed(() =>
  props.issues.find((issue) => issue.id === selectedIssueId.value)
)

const filters = ref<IssueFilters>(defaultIssueFilters(props.meId))
const resetFilters = () => (filters.value = defaultIssueFilters(props.meId))

watch(
  () => props.meId,
  (id, previous) => (filters.value = withLateMeId(filters.value, id, previous))
)

const filteredIssues = computed(() => applyIssueFilters(props.issues, filters.value))
const statusCounts = computed(() => countStatusTabs(props.issues, filters.value))
const labelOptions = computed(() => labelOptionsOf(props.issues))

const toggleDialog = () => {
  showIssuesDialog.value = !showIssuesDialog.value
}

const openIssueOnWeb = (issueId: string) => {
  app.$baseBinding.openUrl(
    `${props.modelCard.serverUrl}/projects/${props.modelCard?.projectId}/models/${props.modelCard.modelId}#threadId=${issueId}`
  )
}

watch(showIssuesDialog, (open) => {
  if (!open) selectedIssueId.value = undefined
})
</script>
