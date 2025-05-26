<template>
  <ModelCardBase
    ref="cardBase"
    :model-card="modelCard"
    :project="project"
    :can-edit="canEdit"
    @manual-publish-or-load="sendOrCancel"
  >
    <div class="flex max-[275px]:w-full overflow-hidden my-2">
      <FormButton
        v-tippy="'Edit what gets published'"
        :icon-left="Square3Stack3DIcon"
        size="sm"
        color="subtle"
        class="block text-foreground-2 hover:text-foreground overflow-hidden max-w-full !justify-start"
        :disabled="!!modelCard.progress || !props.canEdit"
        full-width
        @click.stop="openFilterDialog = true"
      >
        <!-- Sending&nbsp; -->
        <span class="font-bold">{{ modelCard.sendFilter?.name }}:&nbsp;</span>
        <span class="truncate">{{ modelCard.sendFilter?.summary }}</span>
      </FormButton>
    </div>

    <CommonDialog
      v-model:open="openFilterDialog"
      :title="`Change filter`"
      fullscreen="none"
    >
      <FilterListSelect :filter="modelCard.sendFilter" @update:filter="updateFilter" />

      <div class="mt-4 flex justify-end items-center space-x-2">
        <!-- TODO: Ux wise, users might want to just save the selection and publish it later. -->
        <FormButton size="sm" color="outline" @click.stop="saveFilter()">
          Save
        </FormButton>
        <FormButton size="sm" @click.stop="saveFilterAndSend()">
          Save & Publish
        </FormButton>
      </div>
    </CommonDialog>

    <CommonDialog
      v-model:open="showSetMessageDialog"
      title="Version message"
      fullscreen="none"
    >
      <form @submit="setVersionMessage(versionMessage as string)">
        <div class="text-body-2xs mb-2 ml-1">
          Describe your latest changes to help keep track of design intent.
        </div>
        <FormTextArea
          v-model="versionMessage"
          class="text-xs"
          placeholder="Moved elements to prevent clash"
          autocomplete="off"
          name="name"
          label="Project name"
          color="foundation"
          :show-clear="!!versionMessage"
          :rules="[
            ValidationHelpers.isRequired,
            ValidationHelpers.isStringOfLength({ minLength: 3 })
          ]"
          full-width
        />
        <CommonLoadingBar v-if="isUpdatingVersionMessage" loading />
        <div class="mt-4 flex justify-end items-center space-x-2 w-full">
          <FormButton size="sm" text @click="showSetMessageDialog = false">
            Cancel
          </FormButton>
          <FormButton
            size="sm"
            submit
            :disabled="
              isUpdatingVersionMessage || !versionMessage || versionMessage.length < 3
            "
          >
            Save
          </FormButton>
        </div>
      </form>
    </CommonDialog>
    <template #states>
      <CommonModelNotification
        v-if="expiredNotification"
        :notification="expiredNotification"
      />
      <CommonModelNotification
        v-if="errorNotification"
        :notification="errorNotification"
        :report="modelCard.report"
        @dismiss="store.patchModel(modelCard.modelCardId, { error: undefined })"
      />
      <CommonModelNotification
        v-if="latestVersionNotification"
        :notification="latestVersionNotification"
        :report="modelCard.report"
        @dismiss="
          store.patchModel(modelCard.modelCardId, {
            latestCreatedVersionId: undefined
          })
        "
      />
    </template>
  </ModelCardBase>
</template>
<script setup lang="ts">
import { ref } from 'vue'
import ModelCardBase from '~/components/model/CardBase.vue'
import { Square3Stack3DIcon } from '@heroicons/vue/20/solid'
import type { ModelCardNotification } from '~/lib/models/card/notification'
import type { ISendFilter, ISenderModelCard } from '~/lib/models/card/send'
import type { ProjectModelGroup } from '~/store/hostApp'
import { useHostAppStore } from '~/store/hostApp'
import { useMixpanel } from '~/lib/core/composables/mixpanel'
import { ToastNotificationType, ValidationHelpers } from '@speckle/ui-components'
import { provideApolloClient, useMutation, useQuery } from '@vue/apollo-composable'
import { useAccountStore, type DUIAccount } from '~/store/accounts'
import {
  modelVersionsQuery,
  setVersionMessageMutation
} from '~/lib/graphql/mutationsAndQueries'
const hostAppStore = useHostAppStore()

const { trackEvent } = useMixpanel()
const app = useNuxtApp()

const cardBase = ref<InstanceType<typeof ModelCardBase>>()
const props = defineProps<{
  modelCard: ISenderModelCard
  project: ProjectModelGroup
  canEdit: boolean
}>()

const store = useHostAppStore()
const openFilterDialog = ref(false)
app.$baseBinding.on('documentChanged', () => {
  openFilterDialog.value = false
})

const sendOrCancel = () => {
  if (!props.canEdit) {
    return
  }
  if (props.modelCard.progress) store.sendModelCancel(props.modelCard.modelCardId)
  else store.sendModel(props.modelCard.modelCardId, 'ModelCardButton')
  hasSetVersionMessage.value = false
}

let newFilter: ISendFilter
const updateFilter = (filter: ISendFilter) => {
  newFilter = filter
}

const saveFilter = async () => {
  void trackEvent('DUI3 Action', {
    name: 'Publish Card Filter Change',
    filter: newFilter.typeDiscriminator
  })

  // do not reset idmap while creating a new one because it is managed by host app
  newFilter.idMap = props.modelCard.sendFilter?.idMap

  await store.patchModel(props.modelCard.modelCardId, {
    sendFilter: newFilter,
    expired: true
  })
  openFilterDialog.value = false
}

const showSetMessageDialog = ref(false)
const isUpdatingVersionMessage = ref(false)
const hasSetVersionMessage = ref(false)
const versionMessage = ref<string>()

const accountStore = useAccountStore()
const account = accountStore.accounts.find(
  (acc) => acc.accountInfo.id === props.project.accountId
) as DUIAccount

const setVersionMessage = async (message: string) => {
  if (!props.modelCard.latestCreatedVersionId) {
    return
  }

  void trackEvent('DUI3 Action', {
    name: 'Set version message'
  })

  isUpdatingVersionMessage.value = true
  const { mutate } = provideApolloClient(account.client)(() =>
    useMutation(setVersionMessageMutation)
  )

  const res = await mutate({
    input: {
      projectId: props.project.projectId,
      versionId: props.modelCard.latestCreatedVersionId,
      message
    }
  })

  if (res?.data?.versionMutations.update.id) {
    // seemed to noisy, and autoclose does not work for some reason.
    // nicer ux to just close the dialog
    // hostAppStore.setNotification({
    //   type: ToastNotificationType.Info,
    //   title: 'Version message saved',
    //   autoClose: true
    // })
    hasSetVersionMessage.value = true
  } else {
    hostAppStore.setNotification({
      type: ToastNotificationType.Danger,
      title: 'Request failed',
      description: 'Failed to update version message.',
      autoClose: true
    })
  }
  showSetMessageDialog.value = false
  isUpdatingVersionMessage.value = false
  versionMessage.value = ''
}

const saveFilterAndSend = async () => {
  await saveFilter()
  store.sendModel(props.modelCard.modelCardId, 'Filter')
  hasSetVersionMessage.value = false
}

const expiredNotification = computed(() => {
  if (!props.modelCard.expired) return

  const notification = {} as ModelCardNotification
  notification.dismissible = false
  notification.level = props.modelCard.progress ? 'info' : 'info'
  notification.text = props.modelCard.progress
    ? 'Model changed while publishing'
    : 'Out of sync with application'

  const ctaType = props.modelCard.progress ? 'Restart' : 'Update'
  notification.cta = {
    name: ctaType,
    action: async () => {
      hasSetVersionMessage.value = false
      if (props.modelCard.progress) {
        await store.sendModelCancel(props.modelCard.modelCardId)
      }
      store.sendModel(props.modelCard.modelCardId, ctaType)
    }
  }
  return notification
})

const errorNotification = computed(() => {
  if (!props.modelCard.error) return
  const notification = {} as ModelCardNotification
  notification.dismissible = props.modelCard.error.dismissible
  notification.level = 'danger'
  notification.text = props.modelCard.error.errorMessage
  notification.report = props.modelCard.report
  return notification
})

const failRate = computed(() => {
  if (!props.modelCard.report) return 0
  return (
    (props.modelCard.report.filter((r) => r.status === 4).length /
      props.modelCard.report.length) *
    100
  )
})

const sendResultNotificationText = computed(() => {
  if (failRate.value > 80) {
    return 'Version created. Some objects have failed to convert!'
  }
  return 'Version created!'
})

const sendResultNotificationLevel = computed(() => {
  if (failRate.value > 80) {
    return 'warning'
  }
  return 'info'
})

const latestVersionNotification = computed(() => {
  if (!props.modelCard.latestCreatedVersionId) return
  const notification = {} as ModelCardNotification
  notification.dismissible = true
  notification.level = sendResultNotificationLevel.value
  notification.text = sendResultNotificationText.value
  notification.report = props.modelCard.report

  if (
    props.modelCard.latestCreatedVersionId.length === 10 &&
    !hasSetVersionMessage.value
  ) {
    notification.secondaryCta = {
      name: 'Set message',
      tooltipText: 'Describe your changes',
      action: () => (showSetMessageDialog.value = true)
    }
  }

  notification.cta = {
    name: 'View',
    tooltipText: 'Check your model in the browser!',
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access
    action: () => cardBase.value?.viewModel()
  }
  return notification
})
</script>
