import { useHostAppStore } from '~/store/hostApp'
import type { Account } from '~/lib/bindings/definitions/IAccountBinding'
interface CustomProperties {
  [key: string]: object | string | boolean | number | undefined | null
}

export function useAnalytics() {
  const hostApp = useHostAppStore()
  const {
    public: { postHogApiHost, postHogApiKey }
  } = useRuntimeConfig()

  /**
   * Send metrics events to posthog
   * @param eventName Event name.
   * @param account account track with
   * @param customProperties custom properties that will be attached to the properties of track event.
   */
  async function trackEvent(
    eventName: string,
    account: Account,
    customProperties: CustomProperties = {},
    workspaceId: string | null = null
  ) {
    // TODO: enable it later somehow
    // if (process.dev) {
    //   // Only track in production
    //   return
    // }

    try {
      if (!account?.userInfo?.email || !account?.serverInfo?.url) {
        throw new Error('Email or server not found to track event.')
      }

      const url = new URL(account.serverInfo.url)

      if (url === new URL('https://app.speckle.systems')) {
        // Right now, we're keeping posthog only for app.speckle.systems users
        return
      }

      // Get os info from userAgent text
      // taken from original mixpanel implementation
      // https://github.com/mixpanel/mixpanel-js/blob/master/examples/commonjs-browserify/bundle.js#L1576
      const userAgent = navigator.userAgent
      let os = 'unknown'
      if (/Windows/i.test(userAgent)) {
        os = 'Windows'
      } else if (/Mac/i.test(userAgent)) {
        os = 'Mac OS X'
      }
      const [major, minor, patch] = _parseVersion(hostApp.connectorVersion)

      /* eslint-disable camelcase */
      const properties = {
        $os: os,
        //$os_version: null,
        $lib: 'speckle-connectors-dui',
        $lib_version: '3',
        $user_id: account.userInfo.id,
        $session_id: hostApp.sessionId,
        $host: url.host,
        hostAppSlug: hostApp.hostAppName,
        hostAppVersion: hostApp.hostAppVersion as string,
        connectorVersion: hostApp.connectorVersion,
        connectorVersionMajor: major,
        connectorVersionMinor: minor,
        connectorVersionPatch: patch,
        email: account.userInfo.email,
        workspace_id: workspaceId,
        ...customProperties
      }

      const eventData = {
        api_key: postHogApiKey,
        event: eventName.toString(),
        distinct_id: account.userInfo.id,
        properties
      }
      /* eslint-enable camelcase */

      if (import.meta.dev) {
        console.info('Posthog event', eventData)
      }

      const response = await fetch(`https://${postHogApiHost as string}/i/v0/e/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: `data=${btoa(JSON.stringify(eventData))}`
      })

      if (!response.ok) {
        throw new Error(`Analytics event failed: ${response.statusText}`)
      }
    } catch (error) {
      // Handle error or logging
      console.warn('Failed to track event in PostHog:', error)
    }
  }

  function _parseVersion(
    applicationVersion: string | null | undefined
  ): [number | null, number | null, number | null] {
    if (!applicationVersion) {
      return [null, null, null]
    }

    const coreVersion = applicationVersion.split('-')[0]
    const [major, minor, patch] = coreVersion.split('.').map(Number)

    if ([major, minor, patch].some(Number.isNaN)) {
      throw new Error(`Invalid semantic version: ${applicationVersion}`)
    }

    return [major, minor, patch]
  }

  return { trackEvent }
}
