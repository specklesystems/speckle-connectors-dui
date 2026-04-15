import { graphql } from '~/lib/common/generated/gql'

export const workspaceIntercomPermissionQuery = graphql(`
  query WorkspaceIntercomPermission($workspaceId: String!) {
    workspace(id: $workspaceId) {
      id
      permissions {
        canAccessHelpCenter {
          authorized
        }
      }
    }
  }
`)
