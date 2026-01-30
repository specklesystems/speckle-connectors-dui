import { canCreateVersionQuery } from '~/lib/graphql/mutationsAndQueries'
import { canCreateModelIngestionQuery } from '~/lib/ingestion/graphql/queries'
import { useAccountStore } from '~/store/accounts'

// use this composable whenever we need to check against available graphqls over servers
export function useCheckGraphql() {
  /**
   * Checks the ingestions available for the server,
   * if available, returns with respond by appending `queryAvailable = true`
   * otherwise, returns fake result object with `queryAvailable = false`
   */
  const canCreateModelIngestion = async (
    projectId: string,
    modelId: string,
    accountId: string
  ) => {
    const accountsStore = useAccountStore()
    const client = accountsStore.getAccountClient(accountId)
    try {
      const result = await client.query({
        query: canCreateModelIngestionQuery,
        variables: {
          projectId,
          modelId
        },
        fetchPolicy: 'network-only'
      })
      return {
        ...result.data.project.model.permissions.canCreateIngestion,
        queryAvailable: true
      }
    } catch {
      return { queryAvailable: false, authorized: false, message: undefined }
    }
  }

  /**
   * Checks if user can create a version for the given model.
   * Used to validate before starting a publish operation.
   */
  const canCreateVersion = async (
    projectId: string,
    modelId: string,
    accountId: string
  ) => {
    const accountsStore = useAccountStore()
    const client = accountsStore.getAccountClient(accountId)

    try {
      const result = await client.query({
        query: canCreateVersionQuery,
        variables: {
          projectId,
          modelId
        },
        fetchPolicy: 'network-only'
      })

      return result.data.project.model.permissions.canCreateVersion
    } catch (error) {
      // If we can't check, allow the attempt - server will reject if not allowed
      console.error('Failed to check canCreateVersion:', error)
      return { authorized: true, message: null }
    }
  }

  return {
    canCreateVersion,
    canCreateModelIngestion
  }
}
