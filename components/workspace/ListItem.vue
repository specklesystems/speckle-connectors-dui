<template>
  <button
    :class="`group block w-full p-1 text-left rounded-md items-center space-x-2 select-none group transition hover:bg-primary-muted hover:text-primary ${
      workspace.readOnly
        ? 'text-danger bg-rose-500/10 cursor-not-allowed'
        : 'cursor-pointer'
    } ${
      currentSelectedWorkspaceId === workspace.id ? 'bg-blue-500/5 text-primary' : ''
    }`"
    :disabled="workspace.readOnly"
    @click="$emit('select', workspace)"
  >
    <div class="flex items-center space-x-2">
      <WorkspaceAvatar
        :size="'sm'"
        :name="workspace.name || ''"
        :logo="workspace.logoUrl"
      />
      <div class="min-w-0 grow">
        <div class="truncate overflow-hidden min-w-0 flex items-center space-x-2">
          <span>{{ workspace.name }}</span>
        </div>
      </div>
      <button
        v-if="workspace.slug"
        v-tippy="'Open workspace in browser'"
        class="hidden transition mr-1 opacity-70 group-hover:block"
        @click.stop="
          $openUrl(
            `${accountStore.activeAccount.accountInfo.serverInfo.url}/workspaces/${workspace.slug}`
          )
        "
      >
        <ArrowTopRightOnSquareIcon class="w-3.5" />
      </button>
    </div>
  </button>
</template>
<script setup lang="ts">
import type { WorkspaceListWorkspaceItemFragment } from '~/lib/common/generated/gql/graphql'
import { ArrowTopRightOnSquareIcon } from '@heroicons/vue/24/outline'
import { useAccountStore } from '~/store/accounts'

const accountStore = useAccountStore()

defineProps<{
  workspace: WorkspaceListWorkspaceItemFragment
  currentSelectedWorkspaceId: string
}>()

defineEmits<{
  (e: 'select', workspace: WorkspaceListWorkspaceItemFragment): void
}>()
</script>
