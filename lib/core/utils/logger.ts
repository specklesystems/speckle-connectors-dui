import {
  addHyperDXAction,
  isClickstackEnabled,
  recordHyperDXException
} from '~/lib/core/utils/hyperdx'

/**
 * Application logger for the DUI. Writes to the browser console and, when
 * Clickstack is enabled, ships every record to HyperDX with the same attribute
 * shape frontend-3's LogTape sink produces (`log.category`, `log.message`,
 * `log.prop.*`, `log.error.*`), so one HyperDX search covers both apps.
 *
 * Only error records become recorded exceptions. A warn-level record that carries
 * an Error is an expected, handled outcome (offline server, denied permission) —
 * it ships as a `log.warn` action so HyperDX's exception feed only holds failures
 * somebody needs to act on. `debug` records always print to the console, in every
 * build, and are never shipped.
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export type LogProperties = Record<string, unknown>

export interface Logger {
  debug: (message: string, properties?: LogProperties) => void
  info: (message: string, properties?: LogProperties) => void
  warn: (message: string, properties?: LogProperties) => void
  error: (message: string, properties?: LogProperties) => void
}

const APP_CATEGORY = 'speckle-dui'

// Captured at module eval time — before HyperDX monkey-patches console — so the
// console line is not shipped a second time by its console capture.
const originalConsole = { ...globalThis.console } as Console

export function getAppLogger(category: string = APP_CATEGORY): Logger {
  return {
    debug: (message, properties) => log('debug', category, message, properties),
    info: (message, properties) => log('info', category, message, properties),
    warn: (message, properties) => log('warn', category, message, properties),
    error: (message, properties) => log('error', category, message, properties)
  }
}

function log(
  level: LogLevel,
  category: string,
  message: string,
  properties: LogProperties = {}
) {
  const consoleArgs = isEmpty(properties)
    ? [`[${category}] ${message}`]
    : [`[${category}] ${message}`, properties]
  // `debug` is written with console.log, not console.debug: DevTools hides the
  // "Verbose" level by default and the connector webview's console is the one
  // place a support engineer can see binding wiring on a user's machine.
  originalConsole[level === 'debug' ? 'log' : level](...consoleArgs)

  // Debug records are local diagnostics only; they never reach HyperDX.
  if (level === 'debug' || !isClickstackEnabled()) return

  const errorObj = [properties.error, properties.err].find(
    (value): value is Error => value instanceof Error
  )

  const attributes: Record<string, string> = {
    'log.category': category,
    'log.message': message,
    'log.timestamp': new Date().toISOString()
  }
  for (const [key, value] of Object.entries(properties)) {
    if (value === undefined || value instanceof Error) continue
    attributes[`log.prop.${key}`] =
      typeof value === 'string' ? value : safeStringify(value)
  }
  if (errorObj) {
    attributes['log.error.name'] = errorObj.name
    attributes['log.error.message'] = errorObj.message
    if (errorObj.stack) attributes['log.error.stack'] = errorObj.stack
  }

  if (level === 'error') {
    recordHyperDXException(errorObj ?? new Error(message), attributes)
  } else {
    addHyperDXAction(`log.${level}`, attributes)
  }
}

function isEmpty(obj: LogProperties): boolean {
  return Object.keys(obj).length === 0
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value) ?? String(value)
  } catch {
    return '[unserializable]'
  }
}
