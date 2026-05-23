<template>
  <nav
    v-if="!hasNoModelCards"
    class="fixed top-0 h-9 flex items-center bg-foundation border-b border-outline-2 w-full transition z-20"
  >
    <div class="flex items-center transition-all justify-between w-full">
      <div class="flex items-center space-x-2">
        <div class="max-[200px]:hidden block ml-2">
          <img
            class="block h-6 w-6"
            src="~~/assets/images/speckle_logo_big.png"
            alt="Speckle"
          />
        </div>
        <Menu v-if="hasBothActions" as="div" class="relative flex items-center">
          <MenuButton as="template">
            <FormButton color="outline" size="sm" :icon-left="PlusIcon">New</FormButton>
          </MenuButton>
          <Transition
            enter-active-class="transition ease-out duration-200"
            enter-from-class="transform opacity-0 scale-95"
            enter-to-class="transform opacity-100 scale-100"
            leave-active-class="transition ease-in duration-75"
            leave-from-class="transform opacity-100 scale-100"
            leave-to-class="transform opacity-0 scale-95"
          >
            <MenuItems
              class="absolute left-0 top-8 z-30 min-w-[124px] origin-top-left bg-foundation outline outline-1 outline-outline-5 rounded-md shadow-lg overflow-hidden"
            >
              <MenuItem v-slot="{ active }">
                <button
                  type="button"
                  :class="[
                    active ? 'bg-highlight-1' : '',
                    'w-[calc(100%_-_0.5rem)] my-1 text-body-2xs flex items-center gap-x-2 px-2 py-1 text-foreground cursor-pointer transition mx-1 rounded'
                  ]"
                  @click="showSendDialog = true"
                >
                  <ArrowUpTrayIcon class="w-4 shrink-0" />
                  Publish
                </button>
              </MenuItem>
              <MenuItem v-slot="{ active }">
                <button
                  type="button"
                  :class="[
                    active ? 'bg-highlight-1' : '',
                    'w-[calc(100%_-_0.5rem)] my-1 text-body-2xs flex items-center gap-x-2 px-2 py-1 text-foreground cursor-pointer transition mx-1 rounded'
                  ]"
                  @click="showReceiveDialog = true"
                >
                  <ArrowDownTrayIcon class="w-4 shrink-0" />
                  Load
                </button>
              </MenuItem>
            </MenuItems>
          </Transition>
        </Menu>
        <div v-else-if="canPublish" class="relative flex items-center">
          <FormButton
            v-tippy="'Publish objects from this file to a new Speckle model'"
            color="outline"
            size="sm"
            :icon-left="ArrowUpTrayIcon"
            @click="showSendDialog = true"
          >
            Publish
          </FormButton>
        </div>
        <div v-else-if="canLoad" class="relative flex items-center">
          <FormButton
            v-tippy="'Load a model from Speckle into this file'"
            color="outline"
            size="sm"
            :icon-left="ArrowDownTrayIcon"
            @click="showReceiveDialog = true"
          >
            Load
          </FormButton>
        </div>
      </div>

      <div class="flex justify-between items-center pr-1">
        <!-- <FormButton
            v-if="!hostAppStore.isConnectorUpToDate"
            v-tippy="hostAppStore.latestAvailableVersion?.Number.replace('+0', '')"
            :icon-right="ArrowUpCircleIcon"
            size="sm"
            color="subtle"
            class="flex min-w-0 transition text-primary py-1 mr-1"
            @click.stop="hostAppStore.downloadLatestVersion()"
          >
            <span class="">Update</span>
          </FormButton> -->

        <div
          class="text-[8px] text-foreground-disabled max-[150px]:hidden"
          :class="{ 'mr-2': !hostAppStore.isDistributedBySpeckle }"
        >
          {{ hostAppStore.connectorVersion }}
        </div>
        <div
          v-if="!hostAppStore.isDistributedBySpeckle && hostAppStore.hostAppName"
          v-tippy="
            `${hostAppStore.hostAppName
              .charAt(0)
              .toUpperCase()}${hostAppStore.hostAppName.slice(
              1
            )} connector is not distributed by Speckle.`
          "
          class="text-xs text-foreground-disabled max-[150px]:hidden mr-1"
        >
          <CommonBadge color="secondary">Partner</CommonBadge>
        </div>
        <HeaderUserMenu />
      </div>
    </div>
    <SendWizard v-model:open="showSendDialog" @close="showSendDialog = false" />
    <ReceiveWizard
      v-model:open="showReceiveDialog"
      @close="showReceiveDialog = false"
    />
  </nav>
</template>
<script setup lang="ts">
import { ArrowUpTrayIcon, ArrowDownTrayIcon, PlusIcon } from '@heroicons/vue/24/solid'
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/vue'

import { useHostAppStore } from '~/store/hostApp'
const app = useNuxtApp()
const hostAppStore = useHostAppStore()
const hasNoModelCards = computed(() => hostAppStore.projectModelGroups.length === 0)
const canPublish = computed(() => !!app.$sendBinding)
const canLoad = computed(() => !!app.$receiveBinding)
const hasBothActions = computed(() => canPublish.value && canLoad.value)
const showSendDialog = ref<boolean>(false)
const showReceiveDialog = ref<boolean>(false)

app.$baseBinding?.on('documentChanged', () => {
  showSendDialog.value = false
  showReceiveDialog.value = false
})
</script>
