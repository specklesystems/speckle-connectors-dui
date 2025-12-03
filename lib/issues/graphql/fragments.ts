import { graphql } from '~~/lib/common/generated/gql'

export const issueFragment = graphql(`
  fragment IssuesItem on Issue {
    id
    status
    title
    priority
    viewerState
    identifier
    labels {
      hexColor
      id
      name
    }
    author {
      id
      user {
        id
        name
        avatar
      }
    }
    dueDate
    assignee {
      id
      user {
        id
        avatar
        name
      }
    }
  }
`)
