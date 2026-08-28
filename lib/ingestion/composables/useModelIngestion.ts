import {
  provideApolloClient,
  useMutation,
  useSubscription
} from '@vue/apollo-composable'
import { parse } from 'graphql'
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
 * What a browser-side "create version" resolves to once the ingestion has been completed.
 *
 * - `versionId` set, `ingestionId` unset: the server created the version synchronously (pre big-truck
 *   servers, or the `versionMutations.create` fallback). The card can show the version link right away.
 * - `ingestionId` set: the server accepted the root object but the version is born later, at bundle
 *   complete (ADR-0003, ENG-9314). The card must subscribe to the ingestion and only show the version
 *   link on `ModelIngestionSuccessStatus`.
 */
export type CreateVersionResult = {
  versionId?: string
  ingestionId?: string
}

/**
 * New way of creating versions.
 * It is essential for server to track limits on versions.
 * The flow is as follows:
 * 0. Check if the user has enough limits to create a new version (this is handled outside of this composable)
 * 1. Start a new ingestion
 * 2. Update the ingestion with the new data when connector throws progress via 'setModelProgress' event
 * 3. Complete the version with the root object id that passed by connector or server/sketchup bridges in JS
 */
/**
 * Raw (non-codegen) query for the version id the server pre-allocates on
 * ingestion create. `ModelIngestion.versionId` only exists on 4.0 (v2 data
 * endpoint) servers, so this cannot go through codegen against the production
 * schema yet — callers must tolerate it failing on older servers. Built via
 * `parse` (not a `gql` tag) so graphql-codegen's document scanner does not
 * pick it up and fail validation against the production schema.
 *
 * TODO(ENG-9043): once production exposes ModelIngestion.versionId, select it
 * directly in the CreateModelIngestion mutation and delete this probe (and its
 * extra roundtrip in startIngestion) — failure tolerance then becomes a plain
 * optional-field read on the mutation response.
 */
const preallocatedVersionIdQuery = parse(`
  query IngestionPreallocatedVersionId($projectId: String!, $ingestionId: ID!) {
    project(id: $projectId) {
      id
      ingestion(id: $ingestionId) {
        id
        versionId
      }
    }
  }
`)

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

    // On 4.0 servers the ingestion comes with a pre-allocated version id, which
    // connectors on the artifact path need up-front (artifact filenames bake it
    // in). Older servers don't have the field — treat that as "not available".
    let preallocatedVersionId: string | undefined
    if (ingestionId) {
      try {
        const versionRes = await client.query<{
          project?: { ingestion?: { versionId?: string | null } | null }
        }>({
          query: preallocatedVersionIdQuery,
          variables: { projectId: senderModelCard.projectId, ingestionId },
          fetchPolicy: 'network-only'
        })
        preallocatedVersionId =
          versionRes.data?.project?.ingestion?.versionId ?? undefined
      } catch {
        // Older server without ModelIngestion.versionId — artifact-path callers
        // will send without ingestion info and surface a clear connector error.
      }
    }

    const created = res?.data?.projectMutations.modelIngestionMutations.create
    return created ? { ...created, preallocatedVersionId } : created
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

    const completed =
      res?.data?.projectMutations.modelIngestionMutations.completeWithVersion

    // Only forget the ingestion once it reached a terminal state. On a big-truck server (ENG-9314)
    // completeWithVersion returns `processing` - the server still owns the packfile + bundle steps and
    // the user must be able to cancel it from the card until it succeeds or fails.
    const stillRunning =
      completed?.statusData.__typename === 'ModelIngestionProcessingStatus' ||
      completed?.statusData.__typename === 'ModelIngestionQueuedStatus'
    if (!stillRunning) {
      const { activeIngestions } = storeToRefs(store)
      activeIngestions.value = Object.fromEntries(
        Object.entries(activeIngestions.value).filter(
          ([key]) => key !== senderModelCard.modelCardId
        )
      )
    }

    return completed
  }

  /**
   * Turns the `completeWithVersion` reply into what the bridge should hand to `setModelSendResult`.
   * Throws on a terminal failure so the bridge's existing error handling kicks in.
   *
   * @param completed reply of {@link completeIngestionWithVersion}
   * @param ingestionId the ingestion that was completed - returned when the version is not born yet
   */
  const resolveCompletedIngestion = (
    completed: Awaited<ReturnType<typeof completeIngestionWithVersion>>,
    ingestionId: string
  ): CreateVersionResult => {
    const statusData = completed?.statusData
    switch (statusData?.__typename) {
      case 'ModelIngestionSuccessStatus':
        // Pre big-truck server: the version exists now.
        return { versionId: statusData.versionId }
      case 'ModelIngestionProcessingStatus':
      case 'ModelIngestionQueuedStatus':
        // Big-truck server (ENG-9314): the version is born at bundle complete. Subscribe and wait.
        return { ingestionId }
      case 'ModelIngestionFailedStatus':
        throw new Error(
          `Ingestion failed: ${statusData.errorReason || 'Unknown error'}.`
        )
      case 'ModelIngestionCancelledStatus':
        throw new Error('Ingestion cancelled.')
      default:
        throw new Error('Ingestion status does not match the expected types.')
    }
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
    // Terminal state reached (or we stopped caring): the card no longer owns a live ingestion.
    const { activeIngestions } = storeToRefs(store)
    if (activeIngestions.value[modelCardId]) {
      activeIngestions.value = Object.fromEntries(
        Object.entries(activeIngestions.value).filter(([key]) => key !== modelCardId)
      )
    }
  }

  return {
    startIngestion,
    updateIngestion,
    failIngestion,
    cancelIngestion,
    completeIngestionWithVersion,
    resolveCompletedIngestion,
    subscribeToIngestion,
    unsubscribeFromIngestion
  }
}
