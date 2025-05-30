import { watch, computed, ref } from 'vue'
import Intercom, {
  shutdown,
  show,
  hide,
  update,
  trackEvent
} from '@intercom/messenger-js-sdk'
import { useAccountStore } from '~/store/accounts'
import { useHostAppStore } from '~/store/hostApp'
import { storeToRefs } from 'pinia'

const disabledRoutes: string[] = []

export const useIntercom = () => {
  const route = useRoute()

  const accountStore = useAccountStore()
  const { activeAccount } = storeToRefs(accountStore)

  const hostAppStore = useHostAppStore()

  const {
    public: { intercomAppId }
  } = useRuntimeConfig()

  const isInitialized = ref(false)

  const isRouteBlacklisted = computed(() => {
    return disabledRoutes.some((disabledRoute) => route.path.includes(disabledRoute))
  })

  const shouldEnableIntercom = computed(() => !isRouteBlacklisted.value)

  const bootIntercom = () => {
    console.log('YOLO')
    if (!shouldEnableIntercom.value || isInitialized.value || !intercomAppId) return
    isInitialized.value = true

    Intercom({
      /* eslint-disable camelcase */
      app_id: intercomAppId,
      user_id: activeAccount.value.accountInfo.userInfo.id || '',
      name: activeAccount.value.accountInfo.userInfo.name || '',
      email: activeAccount.value.accountInfo.userInfo.email || ''
    })
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

  watch(activeAccount, () => {
    if (isInitialized.value) return
    update({
      user_id: activeAccount.value.accountInfo.userInfo.id || '',
      name: activeAccount.value.accountInfo.userInfo.name,
      email: activeAccount.value.accountInfo.userInfo.email
    })
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
