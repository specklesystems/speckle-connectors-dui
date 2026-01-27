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
          statusData {
            __typename
            ... on ModelIngestionProcessingStatus {
              status
              progressMessage
              progress
            }
            ... on ModelIngestionSuccessStatus {
              status
              versionId
            }
            ... on ModelIngestionFailedStatus {
              errorStacktrace
              errorReason
              status
            }
            ... on ModelIngestionCancelledStatus {
              cancellationMessage
              status
            }
            ... on ModelIngestionQueuedStatus {
              progressMessage
              status
            }
          }
        }
      }
    }
  }
`)

export const failModelIngestionWithError = graphql(`
  mutation FailModelIngestionWithError($input: ModelIngestionFailedInput!) {
    projectMutations {
      modelIngestionMutations {
        failWithError(input: $input) {
          id
          statusData {
            __typename
            ... on ModelIngestionFailedStatus {
              status
              errorReason
              errorStacktrace
            }
          }
        }
      }
    }
  }
`)

export const failModelIngestionWithCancel = graphql(`
  mutation FailModelIngestionWithCancel($input: ModelIngestionCancelledInput!) {
    projectMutations {
      modelIngestionMutations {
        failWithCancel(input: $input) {
          id
          statusData {
            __typename
            ... on ModelIngestionCancelledStatus {
              status
              cancellationMessage
            }
          }
        }
      }
    }
  }
`)
