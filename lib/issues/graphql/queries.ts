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
      data
    }
  }
`)
