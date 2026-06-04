import { provideApolloClient, useMutation } from '@vue/apollo-composable'
import { ToastNotificationType } from '@speckle/ui-components'
import { ResourceMetaType, IssueStatus } from '~/lib/common/generated/gql/graphql'
import { issueResourceMetaSearchQuery } from '~/lib/issues/graphql/queries'
import {
  deleteResourceMetaMutation,
  updateIssueMutation
} from '~/lib/issues/graphql/mutations'
import { useAccountStore } from '~/store/accounts'
import { useHostAppStore } from '~/store/hostApp'
import type { IModelCard } from '~/lib/models/card'
import type {
  IssuesItemFragment,
  IssueResourceMetaSearchQuery
} from '~/lib/common/generated/gql/graphql'

const OBJECT_DELTAS_META_TYPE = 'objectDeltas'

/**
 * Composable that orchestrates the "Apply change requests" workflow.
 *
 * Sequence on user confirm:
 *   1. Apply the parameter changes via $parametersBinding.update (host app).
 *   2. Delete the objectDelta resourceMeta record.
 *   3. Move the linked issue to Resolved.
 *
 * No partial-failure tracking is performed for (1): if some parameter writes
 * fail inside the connector, they are not recoverable. The user accepts this
 * via the confirmation dialog upstream of this composable.
 */
export const useApplyChangeRequests = () => {
  const app = useNuxtApp()
  const accountStore = useAccountStore()
  const hostAppStore = useHostAppStore()

  /**
   * Resolve the resourceMetaId, issueId and the changes payload for a given
   * issue. Returns null if no objectDeltas record is attached to the issue
   */
  const fetchObjectDeltaRecord = async (
    issue: IssuesItemFragment,
    modelCard: IModelCard
  ): Promise<{
    resourceMetaId: string
    issueId: string
    payload: unknown
  } | null> => {
    if (!modelCard.workspaceId) {
      // Personal projects don't have a workspaceId, but resourceMetaSearch
      // requires one. There's no record to apply in that case.
      return null
    }

    const client = accountStore.getAccountClient(modelCard.accountId)

    const result = await client.query({
      query: issueResourceMetaSearchQuery,
      variables: {
        workspaceId: modelCard.workspaceId,
        projectId: modelCard.projectId,
        resourceType: ResourceMetaType.Issue,
        resourceId: issue.id,
        metaType: OBJECT_DELTAS_META_TYPE
      },
      // Fresh read: the record may have been deleted in another session,
      // and we're about to perform a destructive op.
      fetchPolicy: 'network-only'
    })

    const data = result.data as IssueResourceMetaSearchQuery | undefined
    const records = data?.resourceMetaSearch
    if (!Array.isArray(records) || records.length === 0) {
      return null
    }

    const record = records[0] as { id: string; data: unknown }
    return {
      resourceMetaId: record.id,
      issueId: issue.id,
      payload: record.data
    }
  }

  /**
   * Run the full apply workflow.
   */
  const applyChangeRequests = async (
    issue: IssuesItemFragment,
    modelCard: IModelCard
  ): Promise<void> => {
    const record = await fetchObjectDeltaRecord(issue, modelCard)
    if (!record) {
      hostAppStore.setNotification({
        type: ToastNotificationType.Warning,
        title: 'Nothing to apply',
        description: 'No pending change requests were found for this issue.'
      })
      return
    }

    // Step Uno: Push the changes into the host app
    if (!app.$parametersBinding) {
      // No connector-side binding present (e.g. running headless / dev).
      // This is a hard error: we shouldn't have rendered the action.
      throw new Error('Parameters binding is not available in this host app')
    }

    const payloadString =
      typeof record.payload === 'string'
        ? record.payload
        : JSON.stringify(record.payload)

    await app.$parametersBinding.update(payloadString)

    // Step 2 and 3: Delete the record and resolve the issue
    const client = accountStore.getAccountClient(modelCard.accountId)

    const { mutate: deleteRecord } = provideApolloClient(client)(() =>
      useMutation(deleteResourceMetaMutation)
    )
    const { mutate: resolveIssue } = provideApolloClient(client)(() =>
      useMutation(updateIssueMutation)
    )

    const deleteRes = await deleteRecord({
      input: {
        workspaceId: modelCard.workspaceId!,
        projectId: modelCard.projectId,
        resourceMetaId: record.resourceMetaId
      }
    })
    if (deleteRes?.errors?.length) {
      throw new Error(
        `Failed to delete change request record: ${deleteRes.errors[0].message}`
      )
    }

    const updateRes = await resolveIssue({
      input: {
        projectId: modelCard.projectId,
        issueId: record.issueId,
        status: IssueStatus.Resolved
      }
    })
    if (updateRes?.errors?.length) {
      throw new Error(`Failed to resolve issue: ${updateRes.errors[0].message}`)
    }
  }

  return {
    applyChangeRequests
  }
}
