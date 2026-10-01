import type { ApolloError } from '@apollo/client/core'

const MODEL_NOT_FOUND_CODES = ['BRANCH_NOT_FOUND', 'MODEL_NOT_FOUND']

/**
 * True when the server reports that the model behind `project.model(id)` does not exist,
 * i.e. it was deleted. Only the not-found codes on that exact field count: auth, network and
 * project-level errors can be transient (or are handled by the project group) and must not
 * mark a card's model as deleted.
 */
export const isModelNotFoundError = (error?: ApolloError | null): boolean =>
  !!error?.graphQLErrors?.some(
    (err) =>
      MODEL_NOT_FOUND_CODES.includes(err.extensions?.code as string) &&
      err.path?.length === 2 &&
      err.path[0] === 'project' &&
      err.path[1] === 'model'
  )
