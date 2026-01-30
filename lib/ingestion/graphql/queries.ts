import { graphql } from '~~/lib/common/generated/gql'

export const canCreateModelIngestionQuery = graphql(`
  query CanCreateIngestion($modelId: String!, $projectId: String!) {
    project(id: $projectId) {
      model(id: $modelId) {
        permissions {
          canCreateIngestion {
            authorized
            code
            message
          }
        }
      }
    }
  }
`)
