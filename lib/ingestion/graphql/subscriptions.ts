import { graphql } from '~~/lib/common/generated/gql'

export const projectModelIngestionUpdatedSubscription = graphql(`
  subscription ProjectModelIngestionUpdated(
    $input: ProjectModelIngestionSubscriptionInput!
  ) {
    projectModelIngestionUpdated(input: $input) {
      type
      modelIngestion {
        id
        statusData {
          __typename
          ... on ModelIngestionSuccessStatus {
            status
            versionId
          }
          ... on ModelIngestionProcessingStatus {
            status
            progressMessage
            progress
          }
          ... on ModelIngestionFailedStatus {
            status
            errorReason
          }
          ... on ModelIngestionCancelledStatus {
            status
            cancellationMessage
          }
          ... on ModelIngestionQueuedStatus {
            status
            progressMessage
          }
        }
      }
    }
  }
`)
