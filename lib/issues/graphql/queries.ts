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
