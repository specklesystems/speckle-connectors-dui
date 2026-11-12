export type Platform = 'windows' | 'mac' | 'unknown'

export type Version = {
  Number: string
  Url: string
  Os: number
  Architecture: number
  Date: string
  Prerelease: boolean
}

export type Feed = {
  Versions: Version[]
}

export type FeedResolution =
  | { distributed: true; latest: Version | null }
  | { distributed: false }

export const detectPlatform = (userAgent: string): Platform => {
  if (/Windows/i.test(userAgent)) return 'windows'
  if (/Mac/i.test(userAgent)) return 'mac'
  return 'unknown'
}

/** macOS installers are published to a feed of their own (connector-installers ADR-0001). */
export const feedUrl = (slug: string, platform: Platform): string =>
  `https://releases.speckle.dev/manager2/feeds/${slug.toLowerCase()}${
    platform === 'mac' ? '-mac' : ''
  }-v3.json`

export const latestStableVersion = (versions: Version[]): Version | null => {
  const stable = versions.filter((v) => v.Prerelease !== true)
  const sorted = [...stable].sort(
    (a, b) => new Date(b.Date).getTime() - new Date(a.Date).getTime()
  )
  return sorted[0] ?? null
}

export const resolveConnectorFeed = async (
  slug: string,
  platform: Platform,
  fetchFn: typeof fetch = fetch
): Promise<FeedResolution> => {
  const response = await fetchFn(feedUrl(slug, platform), { method: 'GET' })
  if (!response.ok) return { distributed: false }

  const feed = (await response.json()) as Feed
  return { distributed: true, latest: latestStableVersion(feed.Versions ?? []) }
}
