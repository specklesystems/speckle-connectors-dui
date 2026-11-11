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

export const updateIssueMutation = graphql(`
  mutation UpdateIssue($input: UpdateIssueInput!) {
    projectMutations {
      issues {
        updateIssue(input: $input) {
          id
          status
          priority
          assignee {
            id
            user {
              id
              avatar
              name
            }
          }
          labels {
            hexColor
            id
            name
          }
        }
      }
    }
  }
`)
