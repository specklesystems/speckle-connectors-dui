import { storeToRefs } from 'pinia'
import {
  initHyperDX,
  setHyperDXUser,
  resetHyperDXUser,
  setHyperDXAttributes
} from '~/lib/core/utils/hyperdx'
import { useAccountStore } from '~/store/accounts'
import { useHostAppStore } from '~/store/hostApp'

/**
 * Browser OpenTelemetry (RUM) for the DUI, mirroring frontend-3's clickstack +
 * logger plugins. Initializes `@hyperdx/browser` (traces, console/network capture,
 * session RUM) and keeps the active user + host-app context attached to all spans.
 *
 * Runs after `00.bindings.ts` so the account/host-app stores are wired.
 */
export default defineNuxtPlugin(async () => {
  const {
    public: {
      hyperdxEnabled,
      hyperdxCollectorUrl,
      hyperdxIngestionKey,
      hyperdxOtelResourceAttributes,
      speckleUrl
    }
  } = useRuntimeConfig()

  if (!hyperdxEnabled) return

  // Own statement, not inline in the argument: Nuxt's async-context transform
  // wraps every `await` in a plugin, and a nested one ends up inside a
  // non-async arrow (SyntaxError at load in dev).
  const extraResourceAttributes = await resolveConnectorResourceAttributes()

  await initHyperDX({
    url: hyperdxCollectorUrl,
    apiKey: hyperdxIngestionKey,
    apiOrigin: speckleUrl,
    resourceAttributes: hyperdxOtelResourceAttributes,
    extraResourceAttributes
  })

  // Attach connector / host-app context to every session as it becomes known.
  const hostAppStore = useHostAppStore()
  const { hostAppName, hostAppVersion, connectorVersion } = storeToRefs(hostAppStore)
  watch(
    [hostAppName, hostAppVersion, connectorVersion],
    ([name, hostVersion, version]) => {
      setHyperDXAttributes({
        'connector.slug': name || '',
        'connector.hostAppVersion': hostVersion || '',
        'connector.version': version || ''
      })
    },
    { immediate: true }
  )

  // Identify the session with the active Speckle user, tracking account switches.
  const accountStore = useAccountStore()
  const { activeAccount } = storeToRefs(accountStore)
  watch(
    () => activeAccount.value?.accountInfo.userInfo.id,
    (userId) => {
      if (userId) {
        setHyperDXUser(userId)
      } else {
        resetHyperDXUser()
      }
    },
    { immediate: true }
  )
})

/**
 * The connector telemetry gateway drops any record whose *resource* lacks
 * `connector.slug` (ENG-9546); the span-level copies set via
 * `setHyperDXAttributes` above do not satisfy it. The resource is fixed at
 * init, so the three values are read straight off the base binding first —
 * idempotent bridge calls, milliseconds — rather than waiting on the store's
 * own fire-and-forget initialisation. Empty values are left out so the gate
 * sees "missing" rather than "" (both drop, but the row is honest).
 */
async function resolveConnectorResourceAttributes(): Promise<Record<string, string>> {
  const { $baseBinding } = useNuxtApp()
  if (!$baseBinding) return {}

  try {
    const [slug, hostAppVersion, connectorVersion] = await Promise.all([
      $baseBinding.getSourceApplicationName(),
      $baseBinding.getSourceApplicationVersion(),
      $baseBinding.getConnectorVersion()
    ])
    const attrs: Record<string, string> = {}
    if (slug) attrs['connector.slug'] = slug
    if (hostAppVersion) attrs['connector.hostAppVersion'] = hostAppVersion
    if (connectorVersion) attrs['connector.version'] = connectorVersion
    return attrs
  } catch (error) {
    // Observability setup must never take down the app.
    console.warn('[HyperDX] Could not resolve connector resource attributes.', error)
    return {}
  }
}
