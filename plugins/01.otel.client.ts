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

  await initHyperDX({
    url: hyperdxCollectorUrl,
    apiKey: hyperdxIngestionKey,
    apiOrigin: speckleUrl,
    resourceAttributes: hyperdxOtelResourceAttributes
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
