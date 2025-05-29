import type { ConversionResult } from '~/lib/conversions/conversionResult'

export type ModelCardNotificationLevel = 'info' | 'danger' | 'warning' | 'success'

export type ModelCardNotification = {
  modelCardId: string
  text: string
  level: ModelCardNotificationLevel
  secondaryCta?: {
    name: string
    tooltipText?: string
    action: () => void
  }
  cta?: {
    name: string
    tooltipText?: string
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
