<template>
  <div class="space-y-2">
    <div class="space-y-2">
      <div class="flex items-center space-x-2 justify-between">
        <FormTextInput
          v-model="searchText"
          :placeholder="
            totalCount === 0 ? 'New model name' : 'Search in ' + project.name
          "
          name="search"
          autocomplete="off"
          :show-clear="!!searchText"
          full-width
          color="foundation"
        />
        <div
          v-tippy="
            canCreateModelResult?.project.permissions.canCreateModel.authorized
              ? 'Create new model'
              : canCreateModelResult?.project.permissions.canCreateModel.message
          "
        >
          <FormButton
            color="outline"
            :disabled="
              !canCreateModelResult?.project.permissions.canCreateModel.authorized
            "
            :class="`p-1.5 bg-foundation hover:bg-primary-muted rounded text-foreground border`"
            @click="showNewModelDialog = true"
          >
            <PlusIcon class="w-4 -mx-2" />
          </FormButton>
        </div>
      </div>
      <div
        v-if="
          canCreateModelResult &&
          !canCreateModelResult.project.permissions.canCreateModel.authorized
        "
      >
        <CommonAlert title="Cannot create new models" color="info" hide-icon>
          <template #description>
            {{ canCreateModelResult.project.permissions.canCreateModel.message }}

            <FormButton
              v-if="workspaceSlug"
              full-width
              color="primary"
              size="sm"
              class="mt-2"
              @click="
                $openUrl(
                  `${account.accountInfo.serverInfo.url}/settings/workspaces/${workspaceSlug}/billing`
                )
              "
            >
              Explore Plans
            </FormButton>
          </template>
        </CommonAlert>
      </div>
      <div class="relative grid grid-cols-1 gap-2">
        <CommonLoadingBar v-if="loading" loading />

        <WizardListModelCard
          v-for="model in models"
          :key="model.id"
          :model="model"
          :token="token"
          @click="handleModelSelect(model)"
        />

        <CommonDialog
          v-model:open="showSelectionHasProblemsDialog"
          title="Warning"
          fullscreen="none"
        >
          <div class="mx-1">
            <p class="text-body-xs mb-2">You are about to overwrite this model.</p>
            <p
              v-if="hasNonZeroVersionsProblem"
              class="mb-2 text-body-3xs text-foreground-2"
            >
              The model you selected contains versions coming from
              <b>other files/apps</b>
              .
            </p>
            <p v-if="existingModelProblem" class="mb-2 text-body-3xs text-foreground-2">
              <b>{{ ` ${existingModelName}` }}</b>
              is already being used to
              <b>{{ isSender ? 'publish,' : 'load,' }}</b>
              you could consider using the existing one.
            </p>
          </div>
          <template #buttons>
            <FormButton
              full-width
              size="sm"
              text
              @click="showSelectionHasProblemsDialog = false"
            >
              Cancel
            </FormButton>
            <FormButton full-width size="sm" @click="confirmModelSelection()">
              Proceed
            </FormButton>
          </template>
        </CommonDialog>
        <FormButton
          v-if="
            models?.length === 0 &&
            !!searchText &&
            canCreateModelResult?.project.permissions.canCreateModel?.authorized
          "
          full-width
          color="outline"
          :disabled="isCreatingModel"
          @click="createNewModel(searchText)"
        >
          Create "{{ searchText }}"
        </FormButton>
        <FormButton
          v-else
          color="outline"
          full-width
          :disabled="hasReachedEnd"
          @click="loadMore"
        >
          {{ hasReachedEnd ? 'No more models found' : 'Load older models' }}
        </FormButton>
      </div>
    </div>
    <CommonDialog
      v-model:open="showNewModelDialog"
      title="Create new model"
      fullscreen="none"
    >
      <form @submit="createNewModel(newModelName as string)">
        <FormTextInput
          v-model="newModelName"
          :rules="rules"
          :placeholder="hostAppStore.documentInfo?.name"
          name="name"
          color="foundation"
          :show-clear="!!newModelName"
          full-width
          autocomplete="off"
          size="lg"
        />
        <div class="mt-4 flex justify-end items-center space-x-2 w-full">
          <FormButton size="sm" text @click="showNewModelDialog = false">
            Cancel
          </FormButton>
          <FormButton size="sm" submit :disabled="isCreatingModel || !newModelName">
            Create
          </FormButton>
        </div>
      </form>
    </CommonDialog>
  </div>
</template>
<script setup lang="ts">
import { PlusIcon } from '@heroicons/vue/20/solid'
import { provideApolloClient, useMutation, useQuery } from '@vue/apollo-composable'
import type {
  ProjectListProjectItemFragment,
  ModelListModelItemFragment
} from '~/lib/common/generated/gql/graphql'
import { useModelNameValidationRules } from '~/lib/validation'
import {
  canCreateModelInProjectQuery,
  createModelMutation,
  projectModelsQuery
} from '~/lib/graphql/mutationsAndQueries'
import type { DUIAccount } from '~/store/accounts'
import { useAccountStore } from '~/store/accounts'
import { useHostAppStore } from '~/store/hostApp'
import { useMixpanel } from '~/lib/core/composables/mixpanel'

const { trackEvent } = useMixpanel()
const hostAppStore = useHostAppStore()

const emit = defineEmits<{
  (e: 'next', model: ModelListModelItemFragment): void
}>()

const props = withDefaults(
  defineProps<{
    project: ProjectListProjectItemFragment
    workspaceId?: string
    workspaceSlug?: string
    accountId: string
    showNewModel?: boolean
    isSender?: boolean
  }>(),
  { showNewModel: true, isSender: false }
)

const accountStore = useAccountStore()

const account = computed(
  () =>
    accountStore.accounts.find(
      (acc) => acc.accountInfo.id === props.accountId
    ) as DUIAccount
)

const showNewModelDialog = ref(false)
const showSelectionHasProblemsDialog = ref(false)

const searchText = ref<string>()
const newModelName = ref<string>(hostAppStore.documentInfo?.name ?? 'unnamed model')

watch(searchText, () => (newModelName.value = searchText.value as string))

let selectedModel: ModelListModelItemFragment | undefined = undefined
const existingModelProblem = ref(false)
const existingModelName = ref<string | undefined>(undefined)
const hasNonZeroVersionsProblem = ref(false)
const handleModelSelect = (model: ModelListModelItemFragment) => {
  const existingModel = hostAppStore.models.find((m) => m.modelId === model.id)
  existingModelProblem.value = !!existingModel
  if (existingModelProblem.value) {
    existingModelName.value = model.name
  }
  hasNonZeroVersionsProblem.value =
    model.versions.totalCount !== 0 && props.showNewModel // NOTE: we're using the showNewModel prop as a giveaway of whether we're in the send wizard - we do not need this extra check in the receive wizard

  if (!existingModelProblem.value && !hasNonZeroVersionsProblem.value) {
    return emit('next', model)
  }
  selectedModel = model
  showSelectionHasProblemsDialog.value = true
}

const confirmModelSelection = () => {
  existingModelProblem.value = false
  hasNonZeroVersionsProblem.value = false
  emit('next', selectedModel as ModelListModelItemFragment)
}

const rules = useModelNameValidationRules()

const handleModelCreated = (result: ModelListModelItemFragment) => {
  refetch() // Sorts the list with newly created project otherwise it will put the project at the bottom.
  emit('next', result)
}

const isCreatingModel = ref(false)

const createNewModel = async (name: string) => {
  if (!canCreateModelResult.value?.project.permissions.canCreateModel.authorized) {
    hostAppStore.setNotification({
      type: 1,
      title: 'Failed to create model',
      description:
        canCreateModelResult.value?.project.permissions.canCreateModel.message
    })
    return
  }

  isCreatingModel.value = true

  void trackEvent('DUI3 Action', { name: 'Model Create' }, account.value.accountInfo.id)

  const { mutate } = provideApolloClient(account.value.client)(() =>
    useMutation(createModelMutation)
  )
  const res = await mutate({ input: { projectId: props.project.id, name } })
  if (res?.data?.modelMutations.create) {
    refetch() // Sorts the list with newly created model otherwise it will put the model at the bottom.
    // emit('next', res?.data?.modelMutations.create)
    handleModelCreated(res?.data?.modelMutations.create)
  } else {
    let errorMessage = 'Undefined error'
    if (res?.errors && res?.errors.length !== 0) {
      errorMessage = res?.errors[0].message
    }

    hostAppStore.setNotification({
      type: 1,
      title: 'Failed to create model',
      description: errorMessage
    })
  }
  isCreatingModel.value = false
}

const { result: canCreateModelResult } = useQuery(
  canCreateModelInProjectQuery,
  () => ({ projectId: props.project.id }),
  () => ({
    clientId: props.accountId,
    fetchPolicy: 'network-only'
  })
)

const {
  result: projectModelsResult,
  loading,
  fetchMore,
  refetch
} = useQuery(
  projectModelsQuery,
  () => ({
    projectId: props.project.id,
    limit: 10,
    filter: {
      search: (searchText.value || '').trim() || null
    }
  }),
  () => ({ clientId: props.accountId, debounce: 500, fetchPolicy: 'cache-and-network' })
)

const token = computed(() => account.value.accountInfo.token)
const models = computed(() => projectModelsResult.value?.project.models.items)
const totalCount = computed(() => projectModelsResult.value?.project.models.totalCount)
const hasReachedEnd = ref(false)

watch(projectModelsResult, (newVal) => {
  if (
    newVal &&
    newVal?.project.models.items.length >= newVal?.project.models.totalCount
  ) {
    hasReachedEnd.value = true
  } else {
    hasReachedEnd.value = false
  }
})

const loadMore = () => {
  fetchMore({
    variables: { cursor: projectModelsResult.value?.project.models.cursor },
    updateQuery: (previousResult, { fetchMoreResult }) => {
      if (!fetchMoreResult || fetchMoreResult.project.models.items.length === 0) {
        hasReachedEnd.value = true
        return previousResult
      }

      if (
        previousResult.project.models.items.length +
          fetchMoreResult.project.models.items.length >=
        fetchMoreResult.project.models.totalCount
      ) {
        hasReachedEnd.value = true
      }

      return {
        project: {
          id: previousResult.project.id,
          __typename: previousResult.project.__typename,
          models: {
            __typename: previousResult.project.models.__typename,
            totalCount: previousResult.project.models.totalCount,
            cursor: fetchMoreResult.project.models.cursor,
            items: [
              ...previousResult.project.models.items,
              ...fetchMoreResult.project.models.items
            ]
          }
        }
      }
    }
  })
}
</script>
