import { graphql } from '~~/lib/common/generated/gql'

export const issuesListQuery = graphql(`
  query IssuesList($projectId: String!) {
    project(id: $projectId) {
      id
      issues {
        totalCount
        items {
          ...IssuesItem
        }
      }
    }
  }
`)

export const issueResourceMetaSearchQuery = graphql(`
  query IssueResourceMetaSearch(
    $workspaceId: String!
    $resourceType: ResourceMetaType!
    $resourceId: String!
    $projectId: String
    $metaType: String
  ) {
    resourceMetaSearch(
      workspaceId: $workspaceId
      resourceType: $resourceType
      resourceId: $resourceId
      projectId: $projectId
      metaType: $metaType
    ) {
      id
      data
    }
  }
`)

// FEA-775: permissions are fetched per opened issue rather than in the list
// fragment, so a server without `Issue.permissions` leaves the fields read-only
// instead of failing the whole issues list.
export const issueEditPermissionsQuery = graphql(`
  query IssueEditPermissions($projectId: String!, $issueId: ID!) {
    project(id: $projectId) {
      id
      issue(id: $issueId) {
        id
        permissions {
          canEditStatus {
            authorized
            message
          }
          canEditPriority {
            authorized
            message
          }
          canEditAssignee {
            authorized
            message
          }
          canEditLabels {
            authorized
            message
          }
        }
      }
    }
  }
`)

export const issueAssigneesQuery = graphql(`
  query IssueAssignees($projectId: String!, $search: String) {
    project(id: $projectId) {
      id
      allowedIssueAssignees(limit: 20, search: $search) {
        items {
          id
          user {
            id
            name
            avatar
          }
        }
      }
    }
  }
`)

export const issueLabelsQuery = graphql(`
  query IssueLabels($projectId: String!) {
    project(id: $projectId) {
      id
      issueLabels(input: { limit: 100 }) {
        items {
          id
          name
          hexColor
        }
      }
    }
  }
`)
