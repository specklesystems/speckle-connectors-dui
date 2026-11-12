import { describe, expect, it } from 'vitest'
import { FeedOs, stableVersionsFor } from '~/lib/core/updates/feed'

const entry = (
  Number: string,
  Os: number | undefined,
  Date: string,
  Prerelease = false
) => ({
  Number,
  Os,
  Date,
  Prerelease
})

const rhinoFeed = [
  entry('2026.9.3', FeedOs.Windows, '2026-11-01T10:00:00Z'),
  entry('2026.9.4', FeedOs.Windows, '2026-11-08T10:00:00Z'),
  entry('2026.9.4', FeedOs.MacOS, '2026-11-08T10:05:00Z'),
  entry('2026.9.5-beta.1', FeedOs.MacOS, '2026-11-10T10:00:00Z', true)
]

describe('connector release feed', () => {
  it('offers Windows connectors the newest Windows installer, even when a macOS one is newer', () => {
    expect(stableVersionsFor(rhinoFeed, FeedOs.Windows)[0]).toMatchObject({
      Number: '2026.9.4',
      Os: FeedOs.Windows
    })
  })

  it('offers macOS connectors the newest stable macOS installer', () => {
    expect(stableVersionsFor(rhinoFeed, FeedOs.MacOS)).toEqual([
      expect.objectContaining({ Number: '2026.9.4', Os: FeedOs.MacOS })
    ])
  })

  it('treats entries without an Os as Windows installers', () => {
    const legacy = [entry('2.0.0', undefined, '2025-01-01T00:00:00Z')]
    expect(stableVersionsFor(legacy, FeedOs.Windows)).toHaveLength(1)
    expect(stableVersionsFor(legacy, FeedOs.MacOS)).toHaveLength(0)
  })
})
