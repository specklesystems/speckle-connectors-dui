import { graphql } from '~~/lib/common/generated/gql'

export const createModelIngestion = graphql(`
  mutation CreateModelIngestion($input: ModelIngestionCreateInput!) {
    projectMutations {
      modelIngestionMutations {
        create(input: $input) {
          id
        }
      }
    }
  }
`)

export const updateModelIngestionProgress = graphql(`
  mutation UpdateModelIngestionProgress($input: ModelIngestionUpdateInput!) {
    projectMutations {
      modelIngestionMutations {
        updateProgress(input: $input) {
          id
        }
      }
    }
  }
`)

export const completeModelIngestionWithVersion = graphql(`
  mutation CompleteModelIngestionWithVersion($input: ModelIngestionSuccessInput!) {
    projectMutations {
      modelIngestionMutations {
        completeWithVersion(input: $input) {
          id
        }
      }
    }
  }
`)
