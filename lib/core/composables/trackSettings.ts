import { useMixpanel } from '~/lib/core/composables/mixpanel'
import type { CardSetting } from '~/lib/models/card/setting'

export function useSettingsTracking() {
  const { trackEvent } = useMixpanel()

  function trackSettingsChange(
    eventName: string,
    settings: CardSetting[],
    defaultSettings: CardSetting[],
    accountId?: string,
    requireChanges: boolean = false
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
    if (!requireChanges || hasAnyChange) {
      void trackEvent('DUI3 Action', settingProperties, accountId)
    }
  }

  return { trackSettingsChange }
}
