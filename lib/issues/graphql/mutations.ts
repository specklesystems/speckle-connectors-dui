import { graphql } from '~~/lib/common/generated/gql'

/**
 * Delete a resourceMeta record. Returns Boolean — true on success.
 */
export const deleteResourceMetaMutation = graphql(`
  mutation DeleteResourceMeta($input: DeleteResourceMetaInput!) {
    resourceMetaMutations {
      delete(input: $input)
    }
  }
`)

/**
 * Update an issue. We only use this to move status → Resolved when applying
 * change requests, but the mutation accepts the full UpdateIssueInput so it
 * could be reused for other status / field changes later.
 */
export const updateIssueMutation = graphql(`
  mutation UpdateIssue($input: UpdateIssueInput!) {
    projectMutations {
      issues {
        updateIssue(input: $input) {
          id
          status
        }
      }
    }
  }
`)
