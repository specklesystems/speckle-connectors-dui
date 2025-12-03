<template>
  <div class="p-0">
    <slot name="activator" :toggle="toggleDialog"></slot>
    <CommonDialog v-model:open="showIssuesDialog" :title="`Issues`" fullscreen="none">
      <IssuesItem
        v-for="issue in issues"
        :key="issue.id"
        :issue="issue"
        :project-id="projectId"
      />
    </CommonDialog>
  </div>
</template>

<script setup lang="ts">
import type { IssuesItemFragment } from '~/lib/common/generated/gql/graphql'

defineProps<{
  issues: IssuesItemFragment[]
  projectId: string
}>()

const showIssuesDialog = ref(false)

const toggleDialog = () => {
  showIssuesDialog.value = !showIssuesDialog.value
}
</script>
