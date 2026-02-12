<template>
  <div class="space-y-2">
    <div class="space-y-2 relative">
      <div v-if="workspacesEnabled && workspaces" class="flex items-center space-x-2">
        <div class="flex-grow min-w-0">
          <div v-if="workspaces.length === 0">
            <FormButton
              full-width
              class="flex items-center"
              @click="$openUrl('https://app.speckle.systems/workspaces/actions/create')"
            >
              <div class="min-w-0 truncate flex-grow">
                <span>{{ 'Create a workspace' }}</span>
              </div>
              <ArrowTopRightOnSquareIcon class="w-4" />
            </FormButton>
          </div>
          <WorkspaceMenu
            v-else-if="selectedWorkspace"
            :workspaces="workspaces"
            :current-selected-workspace-id="selectedWorkspace.id"
            @workspace:selected="(workspace: WorkspaceListWorkspaceItemFragment) => handleWorkspaceSelected(workspace)"
          >
            <template #activator="{ toggle }">
              <button
                v-tippy="'Click to change the workspace'"
                class="flex items-center w-full p-1 space-x-2 bg-foundation hover:bg-primary-muted rounded text-foreground border"
                @click="toggle()"
              >
                <WorkspaceAvatar
                  :size="'xs'"
                  :name="selectedWorkspace.name || ''"
                  :logo="selectedWorkspace.logoUrl"
                />
                <div class="min-w-0 truncate flex-grow text-left">
                  <span>{{ selectedWorkspace.name }}</span>
                </div>
                <button
                  v-if="selectedWorkspace.slug"
                  v-tippy="'Open workspace in browser'"
                  class="transition mr-1 opacity-70 hover:opacity-100"
                  @click.stop="
                    $openUrl(
                      `${accountStore.activeAccount.accountInfo.serverInfo.url}/workspaces/${selectedWorkspace.slug}`
                    )
                  "
                >
                  <ArrowTopRightOnSquareIcon class="w-3.5" />
                </button>
                <ChevronDownIcon class="h-3 w-3 shrink-0" />
              </button>
            </template>
          </WorkspaceMenu>
        </div>
        <div class="shrink-0 pt-1 px-1">
          <AccountsMenu
            :current-selected-account-id="accountId"
            @select="(e) => selectAccount(e)"
          />
        </div>
      </div>
      <div class="space-y-2">
        <div class="flex items-center space-x-1 justify-between">
          <FormTextInput
            v-model="searchText"
            placeholder="Search your projects"
            name="search"
            autocomplete="off"
            :show-clear="!!searchText"
            full-width
            color="foundation"
          />
          <div class="flex justify-between items-center space-x-2">
            <div
              v-tippy="
                canCreateProject
                  ? 'Create new project'
                  : canCreateProjectPermissionCheck?.message
              "
            >
              <FormButton
                color="outline"
                :disabled="!canCreateProject"
                :class="`p-1.5 bg-foundation hover:bg-primary-muted rounded text-foreground border`"
                @click="showProjectCreateDialog = true"
              >
                <PlusIcon class="w-4 -mx-2" />
              </FormButton>
            </div>
            <CommonDialog
              v-model:open="showProjectCreateDialog"
              :title="`Create new project`"
              fullscreen="none"
            >
              <form @submit="createProject(newProjectName as string)">
                <div class="text-body-2xs mb-2 ml-1">Project name</div>
                <FormTextInput
                  v-model="newProjectName"
                  class="text-xs"
                  placeholder="A Beautiful Home, A Small Bridge..."
                  autocomplete="off"
                  name="name"
                  label="Project name"
                  color="foundation"
                  :show-clear="!!newProjectName"
                  :rules="[
                    ValidationHelpers.isRequired,
                    ValidationHelpers.isStringOfLength({ minLength: 3 })
                  ]"
                  full-width
                />
                <div class="mt-4 flex justify-end items-center space-x-2 w-full">
                  <FormButton size="sm" text @click="showProjectCreateDialog = false">
                    Cancel
                  </FormButton>
                  <FormButton
                    size="sm"
                    submit
                    :disabled="isCreatingProject || !newProjectName"
                  >
                    Create
                  </FormButton>
                </div>
              </form>
            </CommonDialog>
            <div v-if="!workspacesEnabled || !workspaces" class="mt-1">
              <AccountsMenu
                :current-selected-account-id="accountId"
                @select="(e) => selectAccount(e)"
              />
            </div>
          </div>
        </div>

        <WizardPersonalProjectsWarning v-if="isPersonalProjectsAsWorkspace" />

        <CommonLoadingBar v-if="loading || isCreatingProject" loading />
      </div>
      <div v-if="!urlParseError" class="grid grid-cols-1 gap-2 relative z-0">
        <WizardListProjectCard
          v-for="project in projects"
          :key="project.id"
          :project="project"
          :is-sender="isSender"
          @click="handleProjectCardClick(project)"
        />
        <p v-if="projects?.length === 0 && !!searchText" class="text-sm">
          No projects found
        </p>
        <FormButton
          v-if="
            projects?.length === 0 &&
            !!searchText &&
            canCreateProjectPermissionCheck?.authorized
          "
          full-width
          color="outline"
          :disabled="isCreatingProject"
          class="block truncate overflow-hidden"
          @click="createProject(searchText)"
        >
          Create "{{
            searchText.length > 10 ? searchText.substring(0, 10) + '...' : searchText
          }}"
        </FormButton>
        <FormButton
          v-else
          full-width
          :disabled="hasReachedEnd"
          color="outline"
          @click="loadMore"
        >
          {{ hasReachedEnd ? 'No more projects found' : 'Load older projects' }}
        </FormButton>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { ChevronDownIcon, ArrowTopRightOnSquareIcon } from '@heroicons/vue/24/outline'
import { storeToRefs } from 'pinia'
import { PlusIcon } from '@heroicons/vue/20/solid'
import type { DUIAccount } from '~/store/accounts'
import { useAccountStore } from '~/store/accounts'
import {
  activeWorkspaceQuery,
  canCreatePersonalProjectQuery,
  createProjectInWorkspaceMutation,
  createProjectMutation,
  projectsListQuery,
  serverInfoQuery,
  setActiveWorkspaceMutation,
  workspacesListQuery
} from '~/lib/graphql/mutationsAndQueries'
import { useMutation, provideApolloClient, useQuery } from '@vue/apollo-composable'
import { ValidationHelpers } from '@speckle/ui-components'
import type {
  ProjectListProjectItemFragment,
  WorkspaceListWorkspaceItemFragment
} from '~/lib/common/generated/gql/graphql'
import { useMixpanel } from '~/lib/core/composables/mixpanel'
import { useConfigStore } from '~/store/config'
import { useHostAppStore } from '~/store/hostApp'

const hostAppStore = useHostAppStore()
const { trackEvent } = useMixpanel()
const { $openUrl } = useNuxtApp()

const emit = defineEmits<{
  (
    e: 'next',
    accountId: string,
    project: ProjectListProjectItemFragment,
    workspace?: WorkspaceListWorkspaceItemFragment // NOTE: this nullabilities will disappear whenever we are workspace only
  ): void
  (e: 'search-text-update', text: string | undefined): void
}>()

const props = withDefaults(
  defineProps<{
    isSender: boolean
    showNewProject?: boolean
    /**
     * For the send wizard - not allowing selecting projects we can't write to.
     */
    disableNoWriteAccessProjects?: boolean
    urlParseError?: string
  }>(),
  {
    showNewProject: true,
    disableNoWriteAccessProjects: false
  }
)

const searchText = ref<string>()
const newProjectName = ref<string>()
const accountStore = useAccountStore()
const configStore = useConfigStore()
const { activeAccount } = storeToRefs(accountStore)

const accountId = computed(() => activeAccount.value.accountInfo.id)

watch(searchText, () => {
  newProjectName.value = searchText.value
  emit('search-text-update', searchText.value)
})

// TODO: this function is never triggered!! remove or evaluate
const selectAccount = (account: DUIAccount) => {
  refetchServerInfo() // to be able to understand workspaces enabled or not
  refetchActiveWorkspace()
  refetchWorkspaces()
  void trackEvent('DUI3 Action', { name: 'Account Select' }, account.accountInfo.id)
}

const handleProjectCreated = (result: ProjectListProjectItemFragment) => {
  refetch() // Sorts the list with newly created project otherwise it will put the project at the bottom.
  emit('next', accountId.value, result)
}

const { result: serverInfoResult, refetch: refetchServerInfo } = useQuery(
  serverInfoQuery,
  () => ({}),
  () => ({
    clientId: accountId.value,
    debounce: 500,
    fetchPolicy: 'network-only'
  })
)

const workspacesEnabled = computed(
  () => serverInfoResult.value?.serverInfo.workspaces.workspacesEnabled
)

const { result: workspacesResult, refetch: refetchWorkspaces } = useQuery(
  workspacesListQuery,
  () => ({
    limit: 100
  }),
  () => ({
    clientId: accountId.value,
    debounce: 500,
    fetchPolicy: 'network-only'
  })
)

const workspaces = computed(() => workspacesResult.value?.activeUser?.workspaces.items)

const { result: activeWorkspaceResult, refetch: refetchActiveWorkspace } = useQuery(
  activeWorkspaceQuery,
  () => ({}),
  () => ({
    clientId: accountId.value,
    debounce: 500,
    fetchPolicy: 'network-only'
  })
)

const activeWorkspace = computed(() => {
  const userSelectedWorkspaceId = configStore.userSelectedWorkspaceId
  if (userSelectedWorkspaceId) {
    const previouslySelectedWorkspace = workspaces.value?.find(
      (w) => w.id === userSelectedWorkspaceId
    )
    if (previouslySelectedWorkspace) {
      return previouslySelectedWorkspace
    }
  }

  const activeLimitedWorkspace = activeWorkspaceResult.value?.activeUser
    ?.activeWorkspace as WorkspaceListWorkspaceItemFragment

  // fallback to activeWorkspace query result
  if (activeLimitedWorkspace) {
    const activeWorkspace = workspaces.value?.find(
      (w) => w.id === activeLimitedWorkspace.id
    )
    if (activeWorkspace) return activeWorkspace
  }

  return workspaces.value?.[0] // fallback to first workspace if none is active
})

const selectedWorkspace = ref<WorkspaceListWorkspaceItemFragment | undefined>(
  activeWorkspace.value
)

const isPersonalProjectsAsWorkspace = computed(
  () => selectedWorkspace.value?.id === 'personalProject'
)

watch(
  workspaces,
  (newItems) => {
    if (newItems && newItems.length > 0) {
      selectedWorkspace.value = activeWorkspace.value ?? newItems[0]
    } else {
      selectedWorkspace.value = undefined
    }
  },
  { immediate: true }
)

const handleProjectCardClick = (project: ProjectListProjectItemFragment) => {
  if (
    props.isSender
      ? project.permissions.canPublish.authorized
      : project.permissions.canLoad.authorized
  ) {
    emit('next', accountId.value, project, selectedWorkspace.value)
  }
}

const handleWorkspaceSelected = async (
  newSelectedWorkspace: WorkspaceListWorkspaceItemFragment
) => {
  selectedWorkspace.value = newSelectedWorkspace
  const account = computed(() => {
    return accountStore.accounts.find(
      (acc) => acc.accountInfo.id === accountId.value
    ) as DUIAccount
  })
  const { mutate } = provideApolloClient(account.value.client)(() =>
    useMutation(setActiveWorkspaceMutation)
  )
  try {
    await mutate({ slug: newSelectedWorkspace.slug })
  } catch (error) {
    // I dont believe we should throw toast for this, but good to be critical on console
    console.error(error)
  }

  configStore.setUserSelectedWorkspace(newSelectedWorkspace.id)
}

// This is a hack for people who don't have a workspace and have personal projects only.
const timeoutWait = ref(false)

const filtersReady = computed(
  () => selectedWorkspace.value !== undefined || timeoutWait.value
)

onMounted(() => {
  setTimeout(() => {
    timeoutWait.value = true
  }, 1000)
})

const {
  result: projectsResult,
  loading,
  fetchMore,
  refetch
} = useQuery(
  projectsListQuery,
  () => ({
    limit: 10, // stupid hack, increased it since we do manual filter to be able to see more project, see below TODO note, once we have `personalOnly` filter, decrease back to 10
    filter: {
      search: (searchText.value || '').trim() || null,
      workspaceId: isPersonalProjectsAsWorkspace.value
        ? null
        : selectedWorkspace.value?.id,
      includeImplicitAccess: true,
      personalOnly: isPersonalProjectsAsWorkspace.value
    }
  }),
  () => ({
    enabled: filtersReady.value,
    clientId: accountId.value,
    debounce: 500,
    fetchPolicy: 'network-only'
  })
)

const projects = computed(() =>
  isPersonalProjectsAsWorkspace.value // TODO: we need to replace this logic with `personalOnly` filter when it is implemented into app.speckle.systems
    ? projectsResult.value?.activeUser?.projects.items.filter(
        (i) => i.workspaceId === null
      )
    : projectsResult.value?.activeUser?.projects.items
)
const hasReachedEnd = ref(false)

watch(searchText, () => {
  hasReachedEnd.value = false
})

watch(projectsResult, (newVal) => {
  if (
    newVal &&
    newVal.activeUser &&
    newVal?.activeUser?.projects.items.length >= newVal?.activeUser?.projects.totalCount
  ) {
    hasReachedEnd.value = true
  } else {
    hasReachedEnd.value = false
  }
})

const { result: canCreatePersonalProjectResult } = useQuery(
  canCreatePersonalProjectQuery,
  {},
  () => ({
    clientId: accountId.value
  })
)

const canCreateProject = computed(() => {
  // If a workspace is selected, return that permission check
  if (selectedWorkspace.value && selectedWorkspace.value.permissions) {
    return selectedWorkspace.value.permissions.canCreateProject.authorized //as boolean
  }
  // Otherwise, check for personal projects
  if (canCreatePersonalProjectResult) {
    return canCreatePersonalProjectResult.value?.activeUser?.permissions
      .canCreatePersonalProject.authorized
  }
  // To be always safe, default to false
  return false
})

const canCreateProjectPermissionCheck = computed(() => {
  if (selectedWorkspace.value && selectedWorkspace.value.permissions) {
    return selectedWorkspace.value.permissions.canCreateProject
  }
  if (canCreatePersonalProjectResult) {
    return canCreatePersonalProjectResult.value?.activeUser?.permissions
      .canCreatePersonalProject
  }
  return null
})

const isCreatingProject = ref(false)
const showProjectCreateDialog = ref(false)

const createProject = (name: string) => {
  if (
    canCreateProjectPermissionCheck.value &&
    !canCreateProjectPermissionCheck.value.authorized
  ) {
    hostAppStore.setNotification({
      type: 1,
      title: 'Failed to create project',
      description: canCreateProjectPermissionCheck.value.message as string
    })
    return
  }

  if (isPersonalProjectsAsWorkspace.value || !selectedWorkspace.value) {
    return void createNewPersonalProject(name)
  } else {
    return void createNewWorkspaceProject(name)
  }
}

const account = computed(() => {
  return accountStore.accounts.find(
    (acc) => acc.accountInfo.id === accountId.value
  ) as DUIAccount
})

const createNewWorkspaceProject = async (name: string) => {
  isCreatingProject.value = true
  void trackEvent(
    'DUI3 Action',
    { name: 'Project Create', workspace: true },
    accountId.value
  )
  const { mutate, onError } = provideApolloClient(account.value.client)(() =>
    useMutation(createProjectInWorkspaceMutation)
  )

  onError((err) => {
    hostAppStore.setNotification({
      type: 1,
      title: 'Failed to create project',
      description: err.cause?.message ?? err.message ?? 'Unknown error'
    })
  })

  const res = await mutate({
    input: { name, workspaceId: selectedWorkspace.value?.id as string }
  })

  if (res?.data?.workspaceMutations.projects.create) {
    handleProjectCreated(res?.data?.workspaceMutations.projects.create)
  }
  isCreatingProject.value = false
}

const createNewPersonalProject = async (name: string) => {
  isCreatingProject.value = true

  void trackEvent(
    'DUI3 Action',
    { name: 'Project Create', workspace: false },
    account.value.accountInfo.id
  )

  const { mutate, onError } = provideApolloClient(account.value.client)(() =>
    useMutation(createProjectMutation)
  )

  onError((err) => {
    hostAppStore.setNotification({
      type: 1,
      title: 'Failed to create project',
      description: err.cause?.message ?? err.message ?? 'Unknown error'
    })
  })

  const res = await mutate({ input: { name } })

  if (res?.data?.projectMutations.create) {
    return handleProjectCreated(res?.data?.projectMutations.create)
  }

  isCreatingProject.value = false
}

const loadMore = () => {
  fetchMore({
    variables: { cursor: projectsResult.value?.activeUser?.projects.cursor },
    updateQuery: (previousResult, { fetchMoreResult }) => {
      if (!fetchMoreResult || fetchMoreResult.activeUser?.projects.items.length === 0) {
        hasReachedEnd.value = true
        return previousResult
      }

      if (!previousResult.activeUser || !fetchMoreResult.activeUser)
        return previousResult

      return {
        activeUser: {
          id: previousResult.activeUser?.id,
          __typename: previousResult.activeUser?.__typename,
          projects: {
            __typename: previousResult.activeUser?.projects.__typename,
            cursor: fetchMoreResult?.activeUser?.projects.cursor,
            totalCount: fetchMoreResult?.activeUser?.projects.totalCount,
            items: [
              ...previousResult.activeUser.projects.items,
              ...fetchMoreResult.activeUser.projects.items
            ]
          }
        }
      }
    }
  })
}
</script>
