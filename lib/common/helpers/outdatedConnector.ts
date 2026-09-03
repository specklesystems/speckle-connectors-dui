/**
 * Detection of the "old connector talking to a big-truck server" failure (ENG-9404).
 *
 * Connectors built on the pre-ingestion sharp SDK call `completeWithVersion` and expect the
 * server to create the version synchronously. Big-truck servers (ENG-9314) reply with a
 * `processing` ingestion instead, so the connector's Newtonsoft deserializer trips over the
 * missing `data` property and forwards the raw serializer error to the card, e.g.
 *
 *   Required property 'data' not found in JSON. Path 'data.data.data.data.data', line 1, position 42.
 *
 * That text means nothing to a user; the fix on their side is always the same: update the
 * connector. The DUI cannot fix the connector, so it rewrites the message and offers the update.
 */

/**
 * Matches the message *and* the path. "Required property 'data' not found in JSON" on its own is
 * generic Newtonsoft output any `errors`-only GraphQL reply could produce; the nested
 * `data.data.data.data.data` path is what pins it to the old SDK's `completeWithVersion` shape.
 * Line/position are deliberately not matched - they depend on the surrounding JSON.
 */
const OUTDATED_CONNECTOR_ERROR_PATTERNS: RegExp[] = [
  /Required property 'data' not found in JSON\. Path 'data\.data\.data\.data\.data'/i
]

export const OUTDATED_CONNECTOR_ERROR_TITLE = 'Connector update required'

export const OUTDATED_CONNECTOR_ERROR_MESSAGE =
  'Your connector is out of date and can no longer publish to this server. Update it to the latest version and publish again.'

/**
 * True when the error text is the raw serializer failure an outdated connector emits on
 * `completeWithVersion` against a big-truck server.
 */
export const isOutdatedConnectorError = (message?: string | null): boolean => {
  if (!message) return false
  return OUTDATED_CONNECTOR_ERROR_PATTERNS.some((pattern) => pattern.test(message))
}

/**
 * Replaces the raw serializer error with the user-facing "update your connector" text.
 * Any other message passes through untouched.
 */
export const toUserFacingErrorMessage = (message: string): string =>
  isOutdatedConnectorError(message) ? OUTDATED_CONNECTOR_ERROR_MESSAGE : message
