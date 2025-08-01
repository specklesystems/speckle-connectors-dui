<template>
  <div>
    <button
      v-if="!justDialog"
      v-tippy="`Click to change the account.`"
      @click="showAccountsDialog = true"
    >
      <UserAvatar v-if="!showAccountsDialog" :user="user" hover-effect size="sm" />
      <UserAvatar v-else hover-effect size="sm">
        <XMarkIcon class="w-6 h-6" />
      </UserAvatar>
    </button>
    <CommonDialog
      v-model:open="showAccountsDialog"
      :title="`${justDialog ? 'Your accounts' : 'Select account'}`"
      fullscreen="none"
    >
      <div class="pb-2">
        <CommonLoadingBar :loading="isLoading" class="my-0" />
        <AccountsItem
          v-for="acc in accounts"
          :key="acc.accountInfo.id"
          :current-selected-account-id="currentSelectedAccountId"
          :account="(acc as DUIAccount)"
          @select="selectAccount(acc as DUIAccount)"
          @remove="removeAccount(acc as DUIAccount)"
        />
        <div class="mt-4">
          <FormButton
            text
            full-width
            size="sm"
            @click="showAddNewAccount = !showAddNewAccount"
          >
            Add a new account
          </FormButton>
          <CommonDialog
            v-model:open="showAddNewAccount"
            title="Add a new account"
            fullscreen="none"
          >
            <div>
              <div v-if="isDesktopServiceAvailable">
                <AccountsSignInFlow />
              </div>
              <div v-else class="flex flex-wrap justify-center space-x-4 max-width">
                <FormButton text @click="$openUrl(`speckle://accounts`)">
                  Add account via Manager
                </FormButton>
                <FormButton text @click="accountStore.refreshAccounts()">
                  Refresh accounts
                </FormButton>
              </div>
            </div>
          </CommonDialog>
        </div>
      </div>
    </CommonDialog>
  </div>
</template>
<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { XMarkIcon } from '@heroicons/vue/20/solid'
import type { DUIAccount } from '~/store/accounts'
import { useAccountStore } from '~/store/accounts'
import { useMixpanel } from '~/lib/core/composables/mixpanel'
import { useDesktopService } from '~/lib/core/composables/desktopService'

const { trackEvent } = useMixpanel()
const app = useNuxtApp()
const { $openUrl } = useNuxtApp()
const { pingDesktopService } = useDesktopService()

const props = withDefaults(
  defineProps<{
    currentSelectedAccountId?: string
    justDialog?: boolean
  }>(),
  {
    justDialog: false
  }
)

defineEmits<{
  (e: 'select', account: DUIAccount): void
}>()

const showAddNewAccount = ref(false)
// const showAccountsDialog = ref(false)

const showAccountsDialog = defineModel<boolean>('open', {
  required: false,
  default: false
})

const isDesktopServiceAvailable = ref(false) // this should be false default because there is a delay if /ping is not successful.

app.$baseBinding?.on('documentChanged', () => {
  showAccountsDialog.value = false
})

watch(showAccountsDialog, (newVal) => {
  if (newVal) {
    void accountStore.refreshAccounts()
    void trackEvent('DUI3 Action', { name: 'Account menu open' })
  }
})

const accountStore = useAccountStore()
const { accounts, activeAccount, userSelectedAccount, isLoading } =
  storeToRefs(accountStore)

watch(accounts, (newVal, oldVal) => {
  if (newVal.length !== oldVal.length) {
    showAddNewAccount.value = false
  }
})

const selectAccount = (acc: DUIAccount) => {
  if (props.justDialog) {
    app.$openUrl(acc.accountInfo.serverInfo.url)
    return
  }
  userSelectedAccount.value = acc
  accountStore.setUserSelectedAccount(acc) // saves the selected account id into DUI3Config.db for later use
  showAccountsDialog.value = false
  void trackEvent('DUI3 Action', { name: 'Account change' })
}

const removeAccount = async (acc: DUIAccount) => {
  await accountStore.removeAccount(acc)
  void trackEvent('DUI3 Action', { name: 'Account removed' })
}

const user = computed(() => {
  // if (!defaultAccount.value) return undefined
  // let acc = defaultAccount.value
  // if (props.currentSelectedAccountId) {
  //   const currentSelectedAccount = accounts.value.find(
  //     (acc) => acc.accountInfo.id === props.currentSelectedAccountId
  //   ) as DUIAccount
  //   // currentSelectedAccount could be removed by user
  //   if (currentSelectedAccount) {
  //     acc = currentSelectedAccount
  //   }
  // }

  return {
    name: activeAccount.value.accountInfo.userInfo.name,
    avatar: activeAccount.value.accountInfo.userInfo.avatar
  }
})

onMounted(async () => {
  isDesktopServiceAvailable.value = await pingDesktopService()
})
</script>
