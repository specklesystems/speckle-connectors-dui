<template>
  <div>
    <div
      class="px-3 py-1 rounded-md shadow transition overflow-hidden bg-foundation border-foundation-2 hover:shadow-md border-1 group"
    >
      <div class="flex flex-col sm:flex-row sm:gap-2 text-foreground">
        <div class="flex flex-col gap-4">
          <div class="text-body-xs">
            <h1
              class="mb-1 text-sm font-semibold w-full inline-block py-1 bg-clip-text"
            >
              Move your projects to a workspace
            </h1>
            <p class="mb-2">
              <span class="text-xs">
                Personal projects are being phased out. Move your projects to a
                workspace to create new projects and models, invite new project
                collaborators, and view comments and versions older than 7 days. By
                January 1st 2026, all projects will be archived if not moved into a
                workspace.
              </span>
            </p>

            <FormButton
              color="primary"
              size="sm"
              class="mb-2"
              @click="
                $openUrl(
                  `${accountStore.activeAccount.accountInfo.serverInfo.url}/projects`
                )
              "
            >
              Move projects
            </FormButton>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAccountStore } from '~/store/accounts'

const accountStore = useAccountStore()
const { $openUrl } = useNuxtApp()
</script>
