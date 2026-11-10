import { ToastNotificationType } from '@speckle/ui-components'
import type { UpdateIssueInput } from '~/lib/common/generated/gql/graphql'
import { updateIssueMutation } from '~/lib/issues/graphql/mutations'
import type { IModelCard } from '~/lib/models/card'
import { useAccountStore } from '~/store/accounts'
import { useHostAppStore } from '~/store/hostApp'

export type IssueFieldChanges = Pick<
  UpdateIssueInput,
  'status' | 'priority' | 'assigneeId' | 'labelIds'
>

export const useUpdateIssue = (modelCard: IModelCard) => {
  const accountStore = useAccountStore()
  const hostAppStore = useHostAppStore()

  return async (issueId: string, changes: IssueFieldChanges) => {
    try {
      const result = await accountStore.getAccountClient(modelCard.accountId).mutate({
        mutation: updateIssueMutation,
        variables: { input: { issueId, projectId: modelCard.projectId, ...changes } }
      })
      if (!result.data?.projectMutations.issues.updateIssue) {
        throw new Error(result.errors?.[0]?.message ?? 'The server did not save it.')
      }
      return true
    } catch (error) {
      hostAppStore.setNotification({
        type: ToastNotificationType.Danger,
        title: 'Could not update the issue',
        description: error instanceof Error ? error.message : 'Unknown error'
      })
      return false
    }
  }
}
