/** `Os` values in the connector release feed (connector-installers `Speckle.Sdk.Feed` `Os` enum). */
export const FeedOs = {
  Windows: 0,
  MacOS: 1
} as const

export type FeedEntry = {
  Os?: number
  Date: string
  Prerelease?: boolean
}

/**
 * A connector's feed lists every platform's installers under one slug, so the update offer has to pick the newest
 * stable entry for the platform the connector runs on (FEA-124). Entries without an `Os` predate macOS builds and
 * are Windows installers.
 */
export const stableVersionsFor = <T extends FeedEntry>(
  versions: T[],
  os: number
): T[] =>
  versions
    .filter((v) => v.Prerelease !== true && (v.Os ?? FeedOs.Windows) === os)
    .sort((a, b) => new Date(b.Date).getTime() - new Date(a.Date).getTime())
