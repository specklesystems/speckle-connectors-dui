import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  detectPlatform,
  feedUrl,
  latestStableVersion,
  resolveConnectorFeed,
  type Feed,
  type Version
} from '~/lib/core/utils/connectorFeed'

const MAC_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko)'
const WIN_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Edg/124.0.0.0'

const WIN_FEED = 'https://releases.speckle.dev/manager2/feeds/rhino-v3.json'
const MAC_FEED = 'https://releases.speckle.dev/manager2/feeds/rhino-mac-v3.json'

const version = (over: Partial<Version>): Version => ({
  Number: '3.0.0',
  Url: 'https://releases.speckle.dev/installers/rhino-v3/speckle.rhino.installer-3.0.0.exe',
  Os: 0,
  Architecture: 0,
  Date: '2025-01-01T00:00:00Z',
  Prerelease: false,
  ...over
})

/** Stands in for releases.speckle.dev: each URL maps to a feed body or an HTTP status. */
const fakeFeeds = (feeds: Record<string, Feed | number>) => {
  const requested: string[] = []
  const fetchFn = ((input: RequestInfo | URL) => {
    const url = String(input)
    requested.push(url)
    const feed = feeds[url] ?? 404
    return Promise.resolve(
      typeof feed === 'number'
        ? { ok: false, status: feed, json: () => Promise.reject(new Error('no body')) }
        : { ok: true, status: 200, json: () => Promise.resolve(feed) }
    )
  }) as unknown as typeof fetch
  return { requested, fetchFn }
}

describe('connector release feed', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  describe('detectPlatform', () => {
    it('detects macOS from a WebKit user agent', () => {
      expect(detectPlatform(MAC_UA)).toBe('mac')
    })

    it('detects Windows from a WebView2 user agent', () => {
      expect(detectPlatform(WIN_UA)).toBe('windows')
    })

    it('reports unknown for anything else', () => {
      expect(detectPlatform('Node.js/22')).toBe('unknown')
    })
  })

  describe('feedUrl', () => {
    it('points Windows and unknown hosts at the slug-v3 feed', () => {
      expect(feedUrl('rhino', 'windows')).toBe(WIN_FEED)
      expect(feedUrl('rhino', 'unknown')).toBe(WIN_FEED)
    })

    it('points macOS hosts at the slug-mac-v3 feed', () => {
      expect(feedUrl('rhino', 'mac')).toBe(MAC_FEED)
    })

    it('lowercases the slug', () => {
      expect(feedUrl('Rhino', 'windows')).toBe(WIN_FEED)
    })
  })

  describe('latestStableVersion', () => {
    it('returns the newest stable version by date, ignoring prereleases', () => {
      const older = version({ Number: '3.0.0', Date: '2025-01-01T00:00:00Z' })
      const newest = version({ Number: '3.2.0', Date: '2025-03-01T00:00:00Z' })
      const prerelease = version({
        Number: '3.3.0-beta.1',
        Date: '2025-04-01T00:00:00Z',
        Prerelease: true
      })

      expect(latestStableVersion([older, prerelease, newest])).toBe(newest)
    })

    it('returns null when there is no stable version', () => {
      expect(latestStableVersion([])).toBeNull()
      expect(latestStableVersion([version({ Prerelease: true })])).toBeNull()
    })
  })

  describe('resolveConnectorFeed', () => {
    it('reads the Windows feed on Windows', async () => {
      const latest = version({})
      const host = fakeFeeds({ [WIN_FEED]: { Versions: [latest] } })

      await expect(
        resolveConnectorFeed('rhino', 'windows', host.fetchFn)
      ).resolves.toEqual({
        distributed: true,
        latest
      })
      expect(host.requested).toEqual([WIN_FEED])
    })

    it('reads the Mac feed on macOS', async () => {
      const latest = version({ Os: 1, Url: 'https://example.test/speckle.rhino.pkg' })
      const host = fakeFeeds({ [MAC_FEED]: { Versions: [latest] } })

      await expect(resolveConnectorFeed('rhino', 'mac', host.fetchFn)).resolves.toEqual(
        {
          distributed: true,
          latest
        }
      )
      expect(host.requested).toEqual([MAC_FEED])
    })

    it('reports distributed with no latest when the feed is empty', async () => {
      const host = fakeFeeds({ [WIN_FEED]: { Versions: [] } })

      await expect(
        resolveConnectorFeed('rhino', 'windows', host.fetchFn)
      ).resolves.toEqual({
        distributed: true,
        latest: null
      })
    })

    it('reports not distributed when the Windows feed is missing', async () => {
      const host = fakeFeeds({})

      await expect(
        resolveConnectorFeed('rhino', 'windows', host.fetchFn)
      ).resolves.toEqual({
        distributed: false
      })
      expect(host.requested).toEqual([WIN_FEED])
    })

    it('reports not distributed when the Mac feed is missing, without touching the Windows feed', async () => {
      const host = fakeFeeds({ [WIN_FEED]: { Versions: [version({})] } })

      await expect(resolveConnectorFeed('rhino', 'mac', host.fetchFn)).resolves.toEqual(
        {
          distributed: false
        }
      )
      expect(host.requested).toEqual([MAC_FEED])
    })

    it('propagates a network failure', async () => {
      const fetchFn = (() =>
        Promise.reject(new TypeError('Failed to fetch'))) as unknown as typeof fetch

      await expect(resolveConnectorFeed('rhino', 'windows', fetchFn)).rejects.toThrow(
        'Failed to fetch'
      )
    })

    it('uses the global fetch by default', async () => {
      const host = fakeFeeds({ [MAC_FEED]: { Versions: [] } })
      vi.stubGlobal('fetch', host.fetchFn)

      await expect(resolveConnectorFeed('rhino', 'mac')).resolves.toEqual({
        distributed: true,
        latest: null
      })
      expect(host.requested).toEqual([MAC_FEED])
    })
  })
})
