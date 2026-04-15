<template>
  <div v-if="projectDetails" class="px-[2px] rounded-md">
    <button
      :class="`flex w-full items-center text-foreground-2 justify-between hover:bg-foundation-2 ${
        showModels ? 'bg-foundation-2' : 'bg-foundation-2'
      } rounded-md transition group`"
      @click="showModels = !showModels"
    >
      <div class="flex items-center transition group-hover:text-primary h-8 min-w-0">
        <CommonIconsArrowFilled
          :class="`w-5 ${showModels ? '' : '-rotate-90'} transition`"
        />
        <div class="text-sm text-left truncate select-none flex items-center leading-1">
          <div class="text-heading-sm">{{ projectDetails.name }}</div>
          <div v-if="!showModels" class="text-body-3xs opacity-50 ml-2 pt-[1px]">
            {{ project.senders.length + project.receivers.length }}
          </div>
        </div>
      </div>

      <div
        :class="
          isPersonalProject ? '' : 'opacity-0 group-hover:opacity-100 transition flex'
        "
      >
        <button
          v-tippy="projectNavigatorTippy"
          class="hover:text-primary flex items-center space-x-2 p-2 relative animate-pulse"
        >
          <div class="relative w-4 h-4">
            <ArrowTopRightOnSquareIcon
              class="w-4 h-4"
              @click.stop="
                $openUrl(projectUrl),
                  trackEvent('DUI3 Action', { name: 'Project View' }, project.accountId)
              "
            />
          </div>
        </button>
      </div>
    </button>

    <div v-show="showModels" class="space-y-2 mt-2 pb-1">
      <CommonAlert
        v-if="isWorkspaceReadOnly"
        size="xs"
        :color="'warning'"
        :actions="[
          {
            title: 'Subscribe',
            onClick: () => $openUrl(workspaceUrl)
          }
        ]"
      >
        <template #description>
          The workspace is in a read-only locked state until there's an active
          subscription. Subscribe to a plan to regain full access.
        </template>
      </CommonAlert>
      <ModelSender
        v-for="model in project.senders"
        :key="model.modelCardId"
        :model-card="model"
        :project="project"
        :can-edit="canPublish"
      />
      <ModelReceiver
        v-for="model in project.receivers"
        :key="model.modelCardId"
        :model-card="model"
        :project="project"
        :can-edit="canLoad"
      />
    </div>
  </div>
  <div
    v-if="projectIsAccesible === false"
    class="px-2 py-4 bg-foundation dark:bg-neutral-700/10 rounded-md shadow"
  >
    <CommonAlert
      color="danger"
      with-dismiss
      @dismiss="askDismissProjectQuestionDialog = true"
    >
      <template #title>
        Whoops - project
        <code>{{ project.projectId }}</code>
        is inaccessible.
      </template>
    </CommonAlert>
    <CommonDialog v-model:open="askDismissProjectQuestionDialog" fullscreen="none">
      <template #header>Remove Project</template>
      <div class="text-xs mb-4">Do you want to remove the project from this file?</div>
      <div class="flex justify-between center py-2 space-x-3">
        <FormButton size="sm" full-width @click="removeProjectModels">
          Remove
        </FormButton>
        <FormButton
          size="sm"
          full-width
          @click="askDismissProjectQuestionDialog = false"
        >
          Cancel
        </FormButton>
      </div>
    </CommonDialog>
  </div>
</template>
<script setup lang="ts">
import { useQuery, useSubscription } from '@vue/apollo-composable'
import { ArrowTopRightOnSquareIcon } from '@heroicons/vue/20/solid'
import type { ProjectModelGroup } from '~~/store/hostApp'
import { useHostAppStore } from '~~/store/hostApp'
import { useAccountStore } from '~~/store/accounts'
import {
  projectDetailsQuery,
  versionCreatedSubscription,
  userProjectsUpdatedSubscription,
  projectUpdatedSubscription
} from '~~/lib/graphql/mutationsAndQueries'
import { useMixpanel } from '~/lib/core/composables/mixpanel'

const { trackEvent } = useMixpanel()
const accountStore = useAccountStore()
const hostAppStore = useHostAppStore()
const { $openUrl } = useNuxtApp()

const props = defineProps<{
  project: ProjectModelGroup
}>()

const showModels = ref(true)
const askDismissProjectQuestionDialog = ref(false)
const writeAccessRequested = ref(false)
const projectIsAccesible = ref<boolean | undefined>(undefined)

const projectAccount = computed(() =>
  accountStore.accountWithFallback(props.project.accountId, props.project.serverUrl)
)

const isPersonalProject = computed(() => !projectDetails.value?.workspace)
const projectNavigatorTippy = computed(() =>
  isPersonalProject.value
    ? 'Move personal project into a workspace'
    : 'Open project in browser'
)

const normalizeUrl = (url: string) => url.replace(/\/$/, '').toLowerCase()

// match by account ID first, then fall back to server URL
// normalized to avoid trailing-slash / casing mismatches (can that even be a thing??)
const accountExists = computed(() => {
  const byId = accountStore.isAccountExistsById(props.project.accountId)
  const byServer = accountStore.accounts.some(
    (acc) =>
      normalizeUrl(acc.accountInfo.serverInfo.url) ===
      normalizeUrl(props.project.serverUrl)
  )
  return byId || byServer
})

// reactive so it re-derives if accounts change after mount (e.g. user adds the missing account)
const clientId = computed(() => projectAccount.value.accountInfo.id)

const {
  result: projectDetailsResult,
  refetch: refetchProjectDetails,
  onError: onProjectDetailsError
} = useQuery(
  projectDetailsQuery,
  () => ({ projectId: props.project.projectId }),
  () => ({
    clientId: clientId.value,
    debounce: 500,
    fetchPolicy: 'network-only',
    enabled: accountExists.value
  })
)

// re-run the query when the resolved account changes (account added) or
// when accountExists flips back to true (account re-added after removal)
watch([clientId, accountExists], ([, exists], [, prevExists]) => {
  if (exists) {
    if (!prevExists) {
      // accountExists just recovered — reset accessible state so we don't
      // show stale inaccessible UI while the query is in flight
      projectIsAccesible.value = undefined
    }
    void refetchProjectDetails()
  }
})

const removeProjectModels = async () => {
  await hostAppStore.removeProjectModels(props.project.projectId)
  askDismissProjectQuestionDialog.value = false
}

const projectDetails = computed(() => projectDetailsResult.value?.project)

watch(
  [projectDetails, accountExists],
  ([details, exists]) => {
    if (!exists) {
      // account not present on this machine at all
      console.warn('[ProjectModelGroup] inaccessible: no matching account', {
        projectId: props.project.projectId,
        storedAccountId: props.project.accountId,
        storedServerUrl: props.project.serverUrl,
        localAccounts: accountStore.accounts.map((a) => ({
          id: a.accountInfo.id,
          serverUrl: a.accountInfo.serverInfo.url
        }))
      })
      projectIsAccesible.value = false
    } else if (details === null) {
      // query resolved but project is missing or user has no permissions
      console.warn('[ProjectModelGroup] inaccessible: project query returned null', {
        projectId: props.project.projectId,
        accountId: props.project.accountId
      })
      projectIsAccesible.value = false
    } else if (details !== undefined) {
      // query returned real data — project is accessible
      projectIsAccesible.value = true
    }
    // undefined means the query is still loading; don't update state yet
  },
  { immediate: true }
)

onProjectDetailsError((error) => {
  const isSsoError = error.graphQLErrors?.some(
    (e) => e.extensions?.code === 'SSO_SESSION_MISSING_OR_EXPIRED_ERROR'
  )
  if (isSsoError) {
    // sso expired - don't mark the project as permanently inaccessible
    return
  }
  console.warn('[ProjectModelGroup] inaccessible: project query errored', {
    projectId: props.project.projectId,
    accountId: props.project.accountId,
    error: error.message
  })
  projectIsAccesible.value = false
})

// when the account's validity changes (e.g. SSO session deleted externally), refetch
// so the query hits the server and picks up the new auth state
const accountIsValid = computed(
  () => accountStore.accounts.find((a) => a.accountInfo.id === clientId.value)?.isValid
)

watch(accountIsValid, (isValid, wasValid) => {
  if (wasValid !== undefined && isValid !== wasValid) {
    void refetchProjectDetails()
  }
})

const canLoad = computed(() => !!projectDetails.value?.permissions.canLoad.authorized)
const canPublish = computed(
  () => !!projectDetails.value?.permissions.canPublish.authorized
)

const isWorkspaceReadOnly = computed(() => {
  if (!projectDetails.value?.workspace) return false // project is not even in a workspace
  return projectDetails.value?.workspace?.readOnly
})

// Enable later when FE2 is ready for accepting/denying requested accesses
// const hasServerMatch = computed(() =>
//   accountStore.isAccountExistsByServer(props.project.serverUrl)
// )

// const requestWriteAccess = async () => {
//   if (hasServerMatch.value) {
//     const { mutate } = provideApolloClient((projectAccount.value as DUIAccount).client)(
//       () => useMutation(requestProjectAccess)
//     )
//     const res = await mutate({
//       input: projectDetails.value?.id as string
//     })
//     writeAccessRequested.value = true
//     // TODO: It throws if it has already pending request, handle it!
//     console.log(res)
//   }
// }

const { onResult: userProjectsUpdated } = useSubscription(
  userProjectsUpdatedSubscription,
  () => ({}),
  () => ({ clientId: clientId.value, enabled: accountExists.value })
)

const { onResult: projectUpdated } = useSubscription(
  projectUpdatedSubscription,
  () => ({ projectId: props.project.projectId }),
  () => ({ clientId: clientId.value, enabled: accountExists.value })
)

// to catch changes on visibility of project
projectUpdated((res) => {
  // TODO: FIX needed: whenever project visibility changed from "discoverable" to "private", we can't get message if the `clientId` is not part of the team
  // validated with Fabians this is a current behavior.
  if (!res.data) return
  refetchProjectDetails()
})

// to catch changes on team of the project
userProjectsUpdated((res) => {
  if (!res.data) return
  refetchProjectDetails()
  writeAccessRequested.value = false
})

const projectUrl = computed(() => {
  const acc = accountStore.accounts.find((acc) => acc.accountInfo.id === clientId.value)
  return `${acc?.accountInfo.serverInfo.url as string}/projects/${
    props.project.projectId
  }`
})

const workspaceUrl = computed(() => {
  const acc = accountStore.accounts.find((acc) => acc.accountInfo.id === clientId.value)
  return `${acc?.accountInfo.serverInfo.url as string}/workspaces/${
    projectDetails.value?.workspace?.slug
  }`
})

// Subscribe to version created events at a project level, and filter to any receivers (if any)
const { onResult } = useSubscription(
  versionCreatedSubscription,
  () => ({ projectId: props.project.projectId }),
  () => ({ clientId: clientId.value, enabled: accountExists.value })
)

onResult((res) => {
  if (!res.data) return
  if (res.data?.projectVersionsUpdated?.type !== 'CREATED') return

  const relevantReceiver = props.project.receivers.find(
    (r) => r.modelId === res.data?.projectVersionsUpdated.version?.model.id
  )
  if (!relevantReceiver) return

  hostAppStore.patchModel(relevantReceiver.modelCardId, {
    latestVersionId: res.data.projectVersionsUpdated.version?.id,
    latestVersionCreatedAt: res.data.projectVersionsUpdated.version?.createdAt,
    hasDismissedUpdateWarning: false,
    displayReceiveComplete: false
  })
})
</script>
