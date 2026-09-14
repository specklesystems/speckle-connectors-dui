import type { Attributes, Context, Span } from '@opentelemetry/api'
import {
  SpanKind,
  SpanStatusCode,
  context,
  isSpanContextValid,
  propagation,
  trace
} from '@opentelemetry/api'

/**
 * Resolved per call, never cached: @hyperdx/browser bundles its own copy of the OTel
 * API, so it registers *its* proxy provider globally and sets the delegate there. A
 * tracer captured from this copy at module load belongs to a proxy provider that never
 * receives that delegate, and stays a no-op for the lifetime of the page.
 */
const getBridgeTracer = () => trace.getTracer('speckle-dui-bridge')

export interface Operation {
  /** Re-establishes the operation context, which `await` destroys, around one call. */
  run: <T>(fn: () => T) => T
  /** For callers that cannot rely on the ambient context, such as Apollo. */
  readonly otelContext: Context
  settle: <T>(promise: Promise<T>) => Promise<T>
  end: (error?: unknown) => void
}

/**
 * Groups the calls a user action fans out into under one span. Must be started
 * synchronously from the event handler, while `context.active()` is still the click.
 */
export function startOperation(name: string, attributes: Attributes): Operation {
  let span: Span | undefined
  let operationContext = context.active()

  try {
    span = getBridgeTracer().startSpan(name, { attributes })
    operationContext = trace.setSpan(operationContext, span)
  } catch {
    span = undefined
  }

  let ended = false
  const end = (error?: unknown) => {
    if (ended) return
    ended = true
    if (error !== undefined) failBridgeSpan(span, error)
    endBridgeSpan(span)
  }

  return {
    run: (fn) => context.with(operationContext, fn),
    otelContext: operationContext,
    settle: (promise) => {
      promise.then(
        () => end(),
        (error: unknown) => end(error)
      )
      return promise
    },
    end
  }
}

export function startBridgeSpan(
  bindingName: string,
  methodName: string,
  requestId: string
): Span | undefined {
  try {
    // Tag names match the connector's RunMethod activity so the client and server
    // halves of a call can be queried together.
    return getBridgeTracer().startSpan(`${bindingName}.${methodName}`, {
      kind: SpanKind.CLIENT,
      attributes: { methodName, requestId }
    })
  } catch {
    return undefined
  }
}

/**
 * The W3C carrier as the connector bridge expects it. Injects from the span's own
 * context rather than the ambient one: HyperDX's context manager cannot follow a
 * native `await`, and bridge calls originate several awaits deep in store actions.
 */
export function serializeTraceContext(span: Span | undefined): string | undefined {
  if (!span) return undefined
  try {
    if (!isSpanContextValid(span.spanContext())) return undefined

    const carrier: Record<string, string> = {}
    propagation.inject(trace.setSpan(context.active(), span), carrier)

    const traceparent = carrier.traceparent
    if (!traceparent) return undefined

    const tracestate = carrier.tracestate
    return JSON.stringify(tracestate ? { traceparent, tracestate } : { traceparent })
  } catch {
    return undefined
  }
}

export function failBridgeSpan(span: Span | undefined, error: unknown): void {
  if (!span) return
  try {
    if (error instanceof Error) span.recordException(error)
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error instanceof Error ? error.message : String(error)
    })
  } catch {
    /* observability must never break a bridge call */
  }
}

export function endBridgeSpan(span: Span | undefined): void {
  try {
    span?.end()
  } catch {
    /* observability must never break a bridge call */
  }
}
