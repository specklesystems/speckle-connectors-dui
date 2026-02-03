import { graphql } from '~~/lib/common/generated/gql'

export const workspacePlanUsageUpdatedSubscription = graphql(`
  subscription WorkspacePlanUsageUpdated($input: WorkspacePlanUsageSubscriptionInput!) {
    workspacePlanUsageUpdated(input: $input)
  }
`)
