/**
 * Origins that outgoing `fetch`/XHR calls carry a W3C `traceparent` header to.
 *
 * The DUI talks to one Speckle server per account, and accounts are only known
 * once the host app hands them over — after the OTel SDK has been initialised.
 * The OTel fetch/XHR instrumentations read their `propagateTraceHeaderCorsUrls`
 * config on every request, so a single shared array that grows as servers
 * become known is enough: no re-initialisation, no restart.
 *
 * Only Speckle servers belong here. Any other origin would get a CORS preflight
 * for the extra header and, if it does not allow it, the request itself fails.
 */
const targets: RegExp[] = []
const registered = new Set<string>()

export function getTracePropagationTargets(): RegExp[] {
  return targets
}

/**
 * Adds a Speckle server to the propagation list. Accepts anything `new URL()`
 * can parse and normalises it to its origin; invalid or repeated values are
 * ignored.
 */
export function registerTracePropagationOrigin(url: string | undefined | null) {
  if (!url) return
  let origin: string
  try {
    origin = new URL(url).origin
  } catch {
    return
  }
  if (registered.has(origin)) return
  registered.add(origin)
  targets.push(new RegExp(`^${escapeRegExp(origin)}(/|$)`))
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
