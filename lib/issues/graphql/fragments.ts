import { graphql } from '~~/lib/common/generated/gql'

export const issueFragment = graphql(`
  fragment IssuesItem on Issue {
    id
    status
    title
    priority
    viewerState
    identifier
    resourceIdString
    activities(input: { limit: 1, sortDirection: asc }) {
      totalCount
      items {
        actor {
          id
          user {
            name
            id
            avatar
          }
        }
        eventType
        createdAt
      }
    }
    replies {
      totalCount
      items {
        id
        author {
          id
          user {
            name
            id
            avatar
          }
        }
        createdAt
        description {
          doc
        }
      }
    }
    description {
      doc
    }
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
