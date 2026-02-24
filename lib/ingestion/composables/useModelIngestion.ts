import {
  provideApolloClient,
  useMutation,
  useSubscription
} from '@vue/apollo-composable'
import { useAccountStore } from '~/store/accounts'
import { useHostAppStore } from '~/store/hostApp'
import {
  completeModelIngestionWithVersion,
  createModelIngestion,
  updateModelIngestionProgress,
  failModelIngestionWithError,
  failModelIngestionWithCancel
} from '../graphql/mutations'
import { projectModelIngestionUpdatedSubscription } from '../graphql/subscriptions'
import type {
  SourceDataInput,
  ProjectModelIngestionUpdatedSubscription
} from '~~/lib/common/generated/gql/graphql'
import type { ISenderModelCard } from '~/lib/models/card/send'
import { storeToRefs } from 'pinia'
import { ToastNotificationType } from '@speckle/ui-components'

/**
 * New way of creating versions.
 * It is essential for server to track limits on versions.
 * The flow is as follows:
 * 0. Check if the user has enough limits to create a new version (this is handled outside of this composable)
 * 1. Start a new ingestion
 * 2. Update the ingestion with the new data when connector throws progress via 'setModelProgress' event
 * 3. Complete the version with the root object id that passed by connector or server/sketchup bridges in JS
 */
export const useModelIngestion = () => {
  const store = useHostAppStore()

  const accountStore = useAccountStore()

  const startIngestion = async (
    senderModelCard: ISenderModelCard,
    progressMessage: string,
    sourceData: SourceDataInput
  ) => {
    const { activeIngestions } = storeToRefs(store)
    const client = accountStore.getAccountClient(senderModelCard.accountId)
    const { mutate } = provideApolloClient(client)(() =>
      useMutation(createModelIngestion)
    )

    const res = await mutate({
      input: {
        projectId: senderModelCard.projectId,
        modelId: senderModelCard.modelId,
        progressMessage,
        sourceData,
        maxIdleTimeoutSeconds: 7200 // 2h
      }
    })

    if (res?.errors?.length) {
      const msg = res.errors[0].message
      store.setNotification({
        type: ToastNotificationType.Danger,
        title: 'Ingestion Error',
        description: msg
      })
      throw new Error(msg)
    }

    const ingestionId = res?.data?.projectMutations.modelIngestionMutations.create.id
    if (ingestionId) {
      activeIngestions.value[senderModelCard.modelCardId] = ingestionId
    }

    return res?.data?.projectMutations.modelIngestionMutations.create
  }

  const updateIngestion = async (
    senderModelCard: ISenderModelCard,
    ingestionId: string,
    progressMessage: string,
    progress?: number
  ) => {
    const client = accountStore.getAccountClient(senderModelCard.accountId)
    const { mutate } = provideApolloClient(client)(() =>
      useMutation(updateModelIngestionProgress)
    )

    const res = await mutate({
      input: {
        projectId: senderModelCard.projectId,
        ingestionId,
        progressMessage,
        progress
      }
    })

    if (res?.errors?.length) {
      const msg = res.errors[0].message
      store.setNotification({
        type: ToastNotificationType.Danger,
        title: 'Ingestion Error',
        description: msg
      })
      throw new Error(msg)
    }

    return res?.data?.projectMutations.modelIngestionMutations.updateProgress
  }

  const failIngestion = async (
    senderModelCard: ISenderModelCard,
    ingestionId: string,
    errorReason: string,
    errorStacktrace?: string
  ) => {
    const client = accountStore.getAccountClient(senderModelCard.accountId)
    const { mutate } = provideApolloClient(client)(() =>
      useMutation(failModelIngestionWithError)
    )

    const res = await mutate({
      input: {
        projectId: senderModelCard.projectId,
        ingestionId,
        errorReason,
        errorStacktrace
      }
    })

    if (res?.errors?.length) {
      const msg = res.errors[0].message
      store.setNotification({
        type: ToastNotificationType.Danger,
        title: 'Ingestion Error',
        description: msg
      })
      throw new Error(msg)
    }

    const { activeIngestions } = storeToRefs(store)

    // clean the failed ingestion
    activeIngestions.value = Object.fromEntries(
      Object.entries(activeIngestions.value).filter(
        ([key]) => key !== senderModelCard.modelCardId
      )
    )
  }

  const cancelIngestion = async (
    senderModelCard: ISenderModelCard,
    ingestionId: string,
    cancellationMessage: string = 'Cancelled by user'
  ) => {
    const client = accountStore.getAccountClient(senderModelCard.accountId)
    const { mutate } = provideApolloClient(client)(() =>
      useMutation(failModelIngestionWithCancel)
    )

    const res = await mutate({
      input: {
        projectId: senderModelCard.projectId,
        ingestionId,
        cancellationMessage
      }
    })

    if (res?.errors?.length) {
      const msg = res.errors[0].message
      store.setNotification({
        type: ToastNotificationType.Danger,
        title: 'Ingestion Error',
        description: msg
      })
      throw new Error(msg)
    }

    const { activeIngestions } = storeToRefs(store)

    // clean the cancelled ingestion
    activeIngestions.value = Object.fromEntries(
      Object.entries(activeIngestions.value).filter(
        ([key]) => key !== senderModelCard.modelCardId
      )
    )
  }

  const completeIngestionWithVersion = async (
    senderModelCard: ISenderModelCard,
    ingestionId: string,
    rootObjectId: string
  ) => {
    const client = accountStore.getAccountClient(senderModelCard.accountId)
    const { mutate } = provideApolloClient(client)(() =>
      useMutation(completeModelIngestionWithVersion)
    )

    const res = await mutate({
      input: {
        projectId: senderModelCard.projectId,
        ingestionId,
        rootObjectId
      }
    })

    if (res?.errors?.length) {
      const msg = res.errors[0].message
      store.setNotification({
        type: ToastNotificationType.Danger,
        title: 'Ingestion Error',
        description: msg
      })
      throw new Error(msg)
    }

    const { activeIngestions } = storeToRefs(store)

    // clean the completed ingestion
    activeIngestions.value = Object.fromEntries(
      Object.entries(activeIngestions.value).filter(
        ([key]) => key !== senderModelCard.modelCardId
      )
    )

    return res?.data?.projectMutations.modelIngestionMutations.completeWithVersion
  }

  // Tracks active ingestion subscriptions so they can be stopped on cancel or terminal state
  const activeSubscriptions: Record<string, () => void> = {}

  /**
   * Subscribes to ingestion status updates for a given ingestionId.
   * Used when the connector (.NET SDK) handles the ingestion and passes the ingestionId
   * back to the DUI via setModelSendResult. The DUI then subscribes to track
   * the server-side processing state until a terminal status is reached.
   *
   * Manages model card state directly: updates progress, sets versionId on success,
   * sets error on failure, and clears progress on terminal states.
   */
  const subscribeToIngestion = (
    senderModelCard: ISenderModelCard,
    ingestionId: string
  ) => {
    const client = accountStore.getAccountClient(senderModelCard.accountId)

    senderModelCard.progress = { status: 'Remote processing...' }

    const { onResult, onError, stop } = provideApolloClient(client)(() =>
      useSubscription(projectModelIngestionUpdatedSubscription, () => ({
        input: {
          projectId: senderModelCard.projectId,
          ingestionReference: { ingestionId }
        }
      }))
    )

    activeSubscriptions[senderModelCard.modelCardId] = stop

    onResult((result) => {
      const data = result.data as ProjectModelIngestionUpdatedSubscription | undefined
      const statusData = data?.projectModelIngestionUpdated?.modelIngestion?.statusData
      if (!statusData) return

      switch (statusData.__typename) {
        case 'ModelIngestionSuccessStatus':
          senderModelCard.latestCreatedVersionId = statusData.versionId
          senderModelCard.progress = undefined
          unsubscribeFromIngestion(senderModelCard.modelCardId)
          break
        case 'ModelIngestionProcessingStatus':
          senderModelCard.progress = {
            status: statusData.progressMessage,
            progress: statusData.progress ?? undefined
          }
          break
        case 'ModelIngestionFailedStatus':
          senderModelCard.error = {
            errorMessage: statusData.errorReason,
            dismissible: true
          }
          senderModelCard.progress = undefined
          unsubscribeFromIngestion(senderModelCard.modelCardId)
          break
        case 'ModelIngestionCancelledStatus':
          senderModelCard.progress = undefined
          unsubscribeFromIngestion(senderModelCard.modelCardId)
          break
        case 'ModelIngestionQueuedStatus':
          senderModelCard.progress = {
            status: statusData.progressMessage
          }
          break
      }
    })

    onError((err) => {
      console.error('Ingestion subscription error:', err)
      unsubscribeFromIngestion(senderModelCard.modelCardId)
    })
  }

  const unsubscribeFromIngestion = (modelCardId: string) => {
    const stop = activeSubscriptions[modelCardId]
    if (stop) {
      stop()
      delete activeSubscriptions[modelCardId]
    }
  }

  return {
    startIngestion,
    updateIngestion,
    failIngestion,
    cancelIngestion,
    completeIngestionWithVersion,
    subscribeToIngestion,
    unsubscribeFromIngestion
  }
}
