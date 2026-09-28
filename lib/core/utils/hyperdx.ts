import {
  getTracePropagationTargets,
  registerTracePropagationOrigin
} from '~/lib/core/utils/tracePropagation'

export const GQL_OPERATION_NAME_HEADER = 'X-GQL-Operation-Name'

/**
 * Browser-side OpenTelemetry (RUM) for the DUI, mirroring frontend-3's
 * `lib/core/utils/hyperdx.ts`. The DUI is a static SPA (no Node runtime), so the
 * server's `@opentelemetry/sdk-node` setup can't run here — instead we use
 * `@hyperdx/browser`, which gives traces, console capture, network capture and
 * session RUM out of the box, exported over OTLP to the same HyperDX collector
 * the rest of the stack uses.
 *
 * Config is baked at build time via `NUXT_PUBLIC_HYPERDX_*` and exposed through
 * `runtimeConfig.public` (see `nuxt.config.ts`), the same way the DUI already
 * injects PostHog config.
 */
type HyperDXModule = typeof import('@hyperdx/browser')
let hyperdx: HyperDXModule['default'] | null = null

export interface HyperDXConfig {
  url: string
  apiKey: string
  /** A Speckle server to propagate trace headers to from the start (local dev). Accounts add theirs later. */
  apiOrigin?: string
  resourceAttributes?: string
  /**
   * Attributes that must live on the OTel *resource*, not on spans. The
   * connector telemetry gateway gates on `resource.attributes["connector.slug"]`
   * (spec 2026-08-clickstack-3x-replatform "Connector telemetry gateway",
   * ENG-9546); `setGlobalAttributes` only stamps spans, so anything the gate
   * needs has to be known here, at init, where the resource is fixed.
   */
  extraResourceAttributes?: Record<string, string>
}

export async function initHyperDX(config: HyperDXConfig): Promise<void> {
  if (!config.url) return

  try {
    const mod = await import('@hyperdx/browser')
    hyperdx = mod.default

    registerTracePropagationOrigin(config.apiOrigin)
    const propagationTargets = getTracePropagationTargets()

    hyperdx.init({
      apiKey: config.apiKey || 'ffffffff-ffff-ffff-ffff-ffffffffffff',
      service: 'speckle-dui',
      url: config.url,
      otelResourceAttributes: {
        ...parseResourceAttributes(config.resourceAttributes),
        ...(config.extraResourceAttributes ?? {})
      },
      tracePropagationTargets: propagationTargets,
      // posthog-js retries its own ingest failures; a PostHog-side 5xx says nothing about
      // our stack (same exclusion as frontend-3). The Nuxt build-manifest poll is the
      // DUI's own heartbeat and was 56 % of all DUI spans (ENG-9940).
      ignoreUrls: [/\.posthog\.com/, /\/_nuxt\/builds\//],
      consoleCapture: true,
      advancedNetworkCapture: true,
      maskAllInputs: true,
      maskAllText: false,
      instrumentations: {
        fetch: {
          propagateTraceHeaderCorsUrls: propagationTargets,
          applyCustomAttributesOnSpan: (span, request, result) => {
            const headers =
              request instanceof Request
                ? request.headers
                : new Headers((request as RequestInit).headers)
            const opName = headers.get(GQL_OPERATION_NAME_HEADER)
            if (opName) {
              span.updateName(`POST GQL [${opName}]`)
            }
            // Cloudflare's ray id is the only handle on a request the origin never saw
            // (edge/LB 5xx) — it is what Cloudflare support and its logs key on.
            const ray = result instanceof Response ? result.headers.get('cf-ray') : null
            if (ray) {
              span.setAttribute('cf.ray', ray)
            }
          }
        },
        xhr: {
          propagateTraceHeaderCorsUrls: propagationTargets
        }
      }
    })
  } catch (error) {
    // Observability setup must never take down the app.
    console.warn(
      '[HyperDX] Failed to initialize — app continues without observability.',
      error
    )
  }
}

export function isClickstackEnabled(): boolean {
  return hyperdx !== null
}

export function setHyperDXUser(userId: string): void {
  hyperdx?.setGlobalAttributes({ userId })
}

export function resetHyperDXUser(): void {
  hyperdx?.setGlobalAttributes({ userId: '' })
}

/** Attach arbitrary global attributes (e.g. host-app / connector context) to all spans. */
export function setHyperDXAttributes(attributes: Record<string, string>): void {
  hyperdx?.setGlobalAttributes(attributes)
}

export function getHyperDXSessionId(): string | undefined {
  return hyperdx?.getSessionId()
}

export function recordHyperDXException(
  error: Error,
  attributes: Record<string, string>
): void {
  hyperdx?.recordException(error, attributes)
}

export function addHyperDXAction(
  name: string,
  attributes: Record<string, string>
): void {
  hyperdx?.addAction(name, attributes)
}

function parseResourceAttributes(raw?: string): Record<string, string> {
  if (!raw) return {}
  const attrs: Record<string, string> = {}
  for (const pair of raw.split(',')) {
    const idx = pair.indexOf('=')
    if (idx > 0) attrs[pair.slice(0, idx)] = pair.slice(idx + 1)
  }
  return attrs
}
