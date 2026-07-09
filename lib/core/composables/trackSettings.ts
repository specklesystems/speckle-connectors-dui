import { useAnalytics } from '~/lib/core/composables/analytics'
import type { Account } from '~/lib/bindings/definitions/IAccountBinding'
import type { CardSetting } from '~/lib/models/card/setting'

export function useSettingsTracking() {
  const { trackEvent } = useAnalytics()

  function trackSettingsChange(
    eventName: string,
    settings: CardSetting[],
    defaultSettings: CardSetting[],
    account?: Account,
    requireChanges: boolean = false,
    workspaceId?: string | null
  ) {
    // building dynamic properties
    // since this can change based on HostApp
    const settingProperties: Record<string, string | boolean | number> = {
      name: eventName
    }

    let hasAnyChange = false
    settings.forEach((setting) => {
      const defaultSetting = defaultSettings.find((s) => s.id === setting.id)
      if (defaultSetting) {
        const isDefault = setting.value === defaultSetting.value
        if (!isDefault) {
          hasAnyChange = true
        }
        // if user selects default, just use 'default'
        settingProperties['setting_' + setting.id] = isDefault
          ? `${setting.value} (default)`
          : setting.value
      }
    })

    // only track if user changed a setting
    if (account && (!requireChanges || hasAnyChange)) {
      void trackEvent('DUI3 Action', account, settingProperties, workspaceId)
    }
  }

  return { trackSettingsChange }
}
