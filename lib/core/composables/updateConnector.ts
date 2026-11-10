import type { ToastNotification } from '@speckle/ui-components'
import { ToastNotificationType } from '@speckle/ui-components'
import { useHostAppStore } from '~/store/hostApp'
import { detectPlatform, resolveConnectorFeed } from '~/lib/core/utils/connectorFeed'

export function useUpdateConnector() {
  const hostApp = useHostAppStore()

  async function checkUpdate() {
    try {
      await getVersions()
    } catch (e) {
      console.error(e)
      const notification: ToastNotification = {
        type: ToastNotificationType.Danger,
        title: `No version found to check update!`
      }
      hostApp.setNotification(notification)
    }
  }

  async function getVersions() {
    const slug = hostApp.hostAppName
    if (!slug) {
      hostApp.setIsDistributedBySpeckle(false)
      return
    }

    try {
      const feed = await resolveConnectorFeed(slug, detectPlatform(navigator.userAgent))
      if (!feed.distributed) {
        hostApp.setIsDistributedBySpeckle(false)
        return
      }
      hostApp.setLatestAvailableVersion(feed.latest)
    } catch (err) {
      if (err instanceof TypeError && err.message === 'Failed to fetch') {
        throw new Error('Network error')
      }
      throw new Error('Unknown error occurred')
    }
  }

  return { checkUpdate }
}
