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
import { useConfigStore } from '~/store/config'
import { storeToRefs } from 'pinia'
import { workspaceIntercomPermissionQuery } from '~/lib/workspaces/graphql/queries'

const disabledRoutes: string[] = []

export const useIntercom = () => {
  const route = useRoute()

  const accountStore = useAccountStore()
  const hostAppStore = useHostAppStore()
  const configStore = useConfigStore()

  const { activeAccount } = storeToRefs(accountStore)
  const { isDistributedBySpeckle } = storeToRefs(hostAppStore)
  const { userSelectedWorkspaceId } = storeToRefs(configStore)

  const isInitialized = ref(false)
  const hasIntercomAccess = ref(false)

  const isRouteBlacklisted = computed(() => {
    return disabledRoutes.some((disabledRoute) => route.path.includes(disabledRoute))
  })

  const shouldEnableIntercom = computed(() => {
    return !isRouteBlacklisted.value && hasIntercomAccess.value
  })

  const bootIntercom = () => {
    if (!shouldEnableIntercom.value || isInitialized.value || !activeAccount.value)
      return

    isInitialized.value = true
    Intercom({
      /* eslint-disable camelcase */
      app_id: 'hoiaq4wn', // note: needs to be harcoded as this is statically served
      user_id: activeAccount.value.accountInfo.userInfo.id || '',
      name: activeAccount.value.accountInfo.userInfo.name || '',
      email: activeAccount.value.accountInfo.userInfo.email || ''
    })
    window.Intercom = Intercom
  }

  const showIntercom = () => {
    if (isInitialized.value) show()
  }
  const hideIntercom = () => {
    if (isInitialized.value) hide()
  }

  const shutdownIntercom = () => {
    if (!isInitialized.value) return
    shutdown()
    isInitialized.value = false
  }

  const trackIntercom = (event: string, metadata?: Record<string, unknown>) => {
    if (isInitialized.value) trackEvent(event, metadata)
  }

  const updateConnectorDetails = (
    hostAppName: string,
    hostAppVersion: string,
    connectorVersion: string
  ) => {
    if (isInitialized.value) {
      update({
        page_title: `CNX: (hostApp: ${hostAppName}:v${hostAppVersion}),(version: ${connectorVersion})`
      })
    }
  }

  const checkPermissions = async () => {
    if (!activeAccount.value || !userSelectedWorkspaceId.value) {
      // userSelectedWorkspaceId is only null before any publish/load action,
      // at which point the NavBar (and feedback button) isn't visible anyway
      hasIntercomAccess.value = false
      return
    }

    try {
      const { data } = await activeAccount.value.client.query({
        query: workspaceIntercomPermissionQuery,
        variables: { workspaceId: userSelectedWorkspaceId.value },
        fetchPolicy: 'cache-first'
      })

      hasIntercomAccess.value =
        data?.workspace?.permissions?.canAccessHelpCenter?.authorized === true
    } catch (e) {
      console.warn('Failed to fetch Intercom permissions for workspace', e)
      hasIntercomAccess.value = false
    }
  }

  watch(route, () => {
    if (isRouteBlacklisted.value || !shouldEnableIntercom.value) shutdownIntercom()
    else bootIntercom()
  })

  // we listen to changes in the host app distribution status that fetched on updateConnector composable after the intercom is initialized, we cant simply rely on activeAccount watcher
  watch(isDistributedBySpeckle, (newValue) => {
    if (!newValue) shutdownIntercom()
  })

  watch(
    [activeAccount, userSelectedWorkspaceId],
    async ([newAccount], [oldAccount]) => {
      await checkPermissions()

      if (newAccount) {
        if (!shouldEnableIntercom.value) {
          shutdownIntercom()
          return
        }

        if (!isInitialized.value) {
          bootIntercom()
        } else if (newAccount.accountInfo.id !== oldAccount?.accountInfo?.id) {
          update({
            user_id: newAccount.accountInfo.userInfo.id || '',
            name: newAccount.accountInfo.userInfo.name,
            email: newAccount.accountInfo.userInfo.email
          })
        }
      } else {
        shutdownIntercom()
      }
    },
    { immediate: true }
  )

  return {
    show: showIntercom,
    hide: hideIntercom,
    shutdown: shutdownIntercom,
    track: trackIntercom,
    updateConnectorDetails,
    shouldEnableIntercom
  }
}

export default defineNuxtPlugin(() => {
  return {
    provide: {
      intercom: useIntercom()
    }
  }
})
