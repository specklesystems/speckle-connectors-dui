import { watch, computed, ref } from 'vue'
import Intercom, {
  shutdown,
  show,
  hide,
  update,
  trackEvent
} from '@intercom/messenger-js-sdk'
import { useAccountStore } from '~/store/accounts'
import { storeToRefs } from 'pinia'

const disabledRoutes: string[] = []

export const useIntercom = () => {
  const route = useRoute()

  const accountStore = useAccountStore()
  const { activeAccount } = storeToRefs(accountStore)

  const isInitialized = ref(false)

  const isRouteBlacklisted = computed(() => {
    return disabledRoutes.some((disabledRoute) => route.path.includes(disabledRoute))
  })

  const shouldEnableIntercom = computed(() => !isRouteBlacklisted.value)

  const bootIntercom = () => {
    if (!shouldEnableIntercom.value || isInitialized.value || !activeAccount.value)
      return

    isInitialized.value = true
    Intercom({
      /* eslint-disable camelcase */
      app_id: 'hoiaq4wn',
      user_id: activeAccount.value.accountInfo.userInfo.id || '',
      name: activeAccount.value.accountInfo.userInfo.name || '',
      email: activeAccount.value.accountInfo.userInfo.email || ''
    })
    window.Intercom = Intercom
  }

  const showIntercom = () => {
    if (!isInitialized.value) return
    show()
  }

  const hideIntercom = () => {
    if (!isInitialized.value) return
    hide()
  }

  const shutdownIntercom = () => {
    if (!isInitialized.value) return
    shutdown()
    isInitialized.value = false
  }

  const trackIntercom = (event: string, metadata?: Record<string, unknown>) => {
    if (!isInitialized.value) return
    trackEvent(event, metadata)
  }

  const updateConnectorDetails = (
    hostAppName: string,
    hostAppVersion: string,
    connectorVersion: string
  ) => {
    update({
      page_title: `CNX: (hostApp: ${hostAppName}:v${hostAppVersion}),(version: ${connectorVersion})`
    })
  }

  // On route change, check if we need to shutodwn or boot Intercom
  watch(route, () => {
    if (isRouteBlacklisted.value) {
      shutdownIntercom()
    } else {
      bootIntercom()
    }
  })

  watch(activeAccount, (newValue) => {
    if (newValue) {
      if (!isInitialized.value) {
        bootIntercom() // if active account changed and itercom is not initialised, do it
        return // we do not need to update, as that's done by default in the init
      }
      update({
        user_id: activeAccount.value.accountInfo.userInfo.id || '',
        name: activeAccount.value.accountInfo.userInfo.name,
        email: activeAccount.value.accountInfo.userInfo.email
      })
    } else {
      if (isInitialized.value) {
        shutdownIntercom()
      }
    }
  })

  return {
    show: showIntercom,
    hide: hideIntercom,
    shutdown: shutdownIntercom,
    track: trackIntercom,
    updateConnectorDetails
  }
}

export default defineNuxtPlugin(() => {
  return {
    provide: {
      intercom: useIntercom()
    }
  }
})
