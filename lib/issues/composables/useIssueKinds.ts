import { gql } from '@apollo/client/core'
import type { Ref } from 'vue'
import type {
  IssuesItemFragment,
  IssueStatus
} from '~/lib/common/generated/gql/graphql'
import type { IssueKind } from '~/lib/issues/filters'
import type { IModelCard } from '~/lib/models/card'
import { useAccountStore } from '~/store/accounts'
import { getAppLogger } from '~/lib/core/utils/logger'

// resourceMetaSearch takes one resourceId, so detecting change requests across a
// list means one aliased lookup per issue (FEA-752); ENG-11637 replaces this
// with a field on the issues list.
const CHUNK_SIZE = 25

const buildLookupDocument = (count: number) => {
  const vars = Array.from({ length: count }, (_, i) => `$id${i}: String!`).join(', ')
  const fields = Array.from(
    { length: count },
    (_, i) =>
      `r${i}: resourceMetaSearch(workspaceId: $workspaceId, projectId: $projectId, resourceType: Issue, resourceId: $id${i}, metaType: "objectDeltas") { id }`
  ).join('\n')
  return gql(
    `query IssueChangeRequestLookup($workspaceId: String!, $projectId: String, ${vars}) {\n${fields}\n}`
  )
}

type Entry = { kind: IssueKind; status: IssueStatus }

export const useIssueKinds = (params: {
  issues: Ref<IssuesItemFragment[]>
  modelCard: IModelCard
  active: Ref<boolean>
}) => {
  const accountStore = useAccountStore()
  const logger = getAppLogger('speckle-dui·issues')
  const entries = ref<Record<string, Entry>>({})
  const loading = ref(false)
  const available = computed(() => !!params.modelCard.workspaceId)
  let generation = 0

  const kindOf = (issueId: string) => entries.value[issueId]?.kind

  // An issue's record is deleted when its change request is applied, which also
  // resolves it, so a status change is the signal to look it up again.
  const needsLookup = (issue: IssuesItemFragment) =>
    entries.value[issue.id]?.status !== issue.status

  const lookUp = async () => {
    const workspaceId = params.modelCard.workspaceId
    if (!params.active.value || !workspaceId) return
    const pending = params.issues.value.filter(needsLookup)
    if (!pending.length) return

    const gen = ++generation
    loading.value = true
    try {
      const client = accountStore.getAccountClient(params.modelCard.accountId)
      for (let start = 0; start < pending.length; start += CHUNK_SIZE) {
        const chunk = pending.slice(start, start + CHUNK_SIZE)
        const variables: Record<string, string> = {
          workspaceId,
          projectId: params.modelCard.projectId
        }
        chunk.forEach((issue, i) => (variables[`id${i}`] = issue.id))

        const { data } = await client.query<Record<string, { id: string }[] | null>>({
          query: buildLookupDocument(chunk.length),
          variables,
          fetchPolicy: 'network-only',
          errorPolicy: 'all'
        })
        if (gen !== generation) return

        const next = { ...entries.value }
        chunk.forEach((issue, i) => {
          const records = data?.[`r${i}`]
          // A failed alias stays unknown and is retried on the next lookup.
          if (!Array.isArray(records)) return
          next[issue.id] = {
            kind: records.length ? 'parameterUpdate' : 'issue',
            status: issue.status
          }
        })
        entries.value = next
      }
    } catch (error) {
      logger.warn('Issue change-request lookup failed', { error })
    } finally {
      if (gen === generation) loading.value = false
    }
  }

  watch([params.issues, params.active], () => void lookUp(), { immediate: true })

  return { kindOf, loading, available }
}
