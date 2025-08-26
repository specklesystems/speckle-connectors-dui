import type { ToastNotification } from '@speckle/ui-components'
import { ToastNotificationType } from '@speckle/ui-components'
import { useHostAppStore } from '~/store/hostApp'

export class UpdateError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'FetchError'

    // Required when extending Error in TypeScript
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

type Versions = {
  Versions: Version[]
}

export type Version = {
  Number: string
  Url: string
  Os: number
  Architecture: number
  Date: string
  Prerelease: boolean
}

export function useUpdateConnector() {
  const hostApp = useHostAppStore()

  const versions = ref<Version[]>([])
  const latestAvailableVersion = ref<Version | null>(null)

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
    try {
      // End point to get list of versions that deployed by Speckle's pipeline
      const response = await fetch(
        `https://releases.speckle.dev/manager2/feeds/${hostApp.hostAppName?.toLowerCase()}-v3.json`,
        {
          method: 'GET'
        }
      )

      if (!response.ok) {
        // It is the only way to understand the connector is distributed by Speckle or not.
        throw new UpdateError('Failed to fetch versions')
      }

      const data = (await response.json()) as unknown as Versions
      const sortedVersions = data.Versions.sort(function (a: Version, b: Version) {
        return new Date(b.Date).getTime() - new Date(a.Date).getTime()
      })
      versions.value = sortedVersions
      latestAvailableVersion.value = sortedVersions[0]
      hostApp.setLatestAvailableVersion(sortedVersions[0])
    } catch (err) {
      if (err instanceof TypeError && err.message === 'Failed to fetch') {
        // When user has network issue in between, actually it is not so likely because regardless user need network to be able to render netlify page
        throw new Error('Network error')
      } else if (err instanceof UpdateError) {
        // We set the flag to use it in relavant places, hide some documentation related buttons etc..
        hostApp.setIsDistributedBySpeckle(false)
      } else {
        // Rest of the possibilites that we trigger toast
        throw new Error('Unknown error occurred')
      }
    }
  }

  return { checkUpdate }
}
