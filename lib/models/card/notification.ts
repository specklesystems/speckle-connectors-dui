import type { ConversionResult } from '~/lib/conversions/conversionResult'

export type ModelCardNotificationLevel = 'info' | 'danger' | 'warning' | 'success'

export type ModelCardNotification = {
  modelCardId: string
  text: string
  level: ModelCardNotificationLevel
  cta?: {
    name: string
    action: () => void
  }
  /**
   * If set, will display a view report button next to cta
   */
  report?: ConversionResult[]
  // TODO figure out re report button
  dismissible: boolean
  timeout?: number
}
