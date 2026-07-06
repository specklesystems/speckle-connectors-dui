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
  /** Origin to propagate trace headers to (the Speckle server). Optional. */
  apiOrigin?: string
  resourceAttributes?: string
}

export async function initHyperDX(config: HyperDXConfig): Promise<void> {
  if (!config.url) return

  try {
    const mod = await import('@hyperdx/browser')
    hyperdx = mod.default

    const originPattern = config.apiOrigin
      ? new RegExp(escapeRegExp(config.apiOrigin))
      : undefined

    hyperdx.init({
      apiKey: config.apiKey || 'ffffffff-ffff-ffff-ffff-ffffffffffff',
      service: 'speckle-dui',
      url: config.url,
      otelResourceAttributes: parseResourceAttributes(config.resourceAttributes),
      tracePropagationTargets: originPattern ? [originPattern] : undefined,
      consoleCapture: true,
      advancedNetworkCapture: true,
      maskAllInputs: true,
      maskAllText: false,
      instrumentations: originPattern
        ? {
            fetch: {
              propagateTraceHeaderCorsUrls: [originPattern]
            }
          }
        : undefined
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

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
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
