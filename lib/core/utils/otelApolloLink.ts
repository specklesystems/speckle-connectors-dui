import type { ApolloLink as ApolloLinkType } from '@apollo/client/core'
import { ApolloLink, Observable } from '@apollo/client/core'
import type { Context } from '@opentelemetry/api'
import { context as otelContext } from '@opentelemetry/api'

export const OTEL_APOLLO_CONTEXT_KEY = 'otelContext'

/**
 * `setContext` resolves a promise chain before it forwards, so by the time HttpLink
 * calls `fetch` the caller's context is long unwound - the browser context manager only
 * follows the synchronous stack. HttpLink does call `fetch` synchronously on subscribe,
 * so re-establishing the context around the subscription is enough.
 *
 * Must sit immediately before HttpLink.
 */
export const otelContextLink: ApolloLinkType = new ApolloLink((operation, forward) => {
  const parent = operation.getContext()[OTEL_APOLLO_CONTEXT_KEY] as Context | undefined
  if (!parent) return forward(operation)

  return new Observable((observer) =>
    otelContext.with(parent, () => forward(operation).subscribe(observer))
  )
})
