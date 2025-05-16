<template>
  <div>
    <div
      class="px-3 py-1 rounded-md shadow transition overflow-hidden bg-foundation border-foundation-2 hover:shadow-md border-2 group"
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
              <span class="text-sm">➊</span>
              <span class="text-xs">
                We are making workspaces the default way to work in Speckle.
              </span>
            </p>

            <p class="mb-1">
              <span class="text-sm">➋</span>
              <span class="text-xs">
                Introducing
                <FormButton
                  text
                  link
                  external
                  size="sm"
                  class="font-semibold"
                  @click="$openUrl(`https://www.speckle.systems/pricing`)"
                >
                  new pricing
                </FormButton>
                including limits to the free plan.
              </span>
            </p>

            <FormButton
              text
              color="primary"
              size="sm"
              :class="showMore ? `mb-1` : ``"
              :icon-right="showMore ? ChevronUpIcon : ChevronDownIcon"
              @click="showMore = !showMore"
            >
              {{ showMore ? 'Show less' : 'Show timeline' }}
            </FormButton>

            <div v-show="showMore">
              <hr />
              <h3 class="font-medium text-warning-darker my-1">By June 1st 2025</h3>
              <p class="text-xs mb-1">Move your projects to a workspace to:</p>
              <ul class="list-disc list-inside pl-2 mb-2">
                <li>
                  <span class="text-xs font-medium">
                    Create new projects and models
                  </span>
                  <span class="text-xs">
                    (will be disabled for personal projects; existing projects and
                    models stay editable)
                  </span>
                </li>
                <li>
                  <span class="text-xs font-medium">
                    Invite new project collaborators
                  </span>
                  <span class="text-xs">
                    (new invites will be unavailable for personal projects)
                  </span>
                </li>
                <li>
                  <span class="text-xs font-medium">
                    Preserve version and comment history
                  </span>
                  <span class="text-xs">
                    (history is reduced to 7 days for personal projects)
                  </span>
                </li>
              </ul>
              <h3 class="font-medium text-warning-darker">By Janury 1st 2026</h3>
              <span class="text-xs mb-1">
                All projects will be archived if not moved into a workspace. Don't
                worry, we'll give you plenty of reminders before then.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ChevronUpIcon, ChevronDownIcon } from '@heroicons/vue/20/solid'

const { $openUrl } = useNuxtApp()
const showMore = ref(false)
</script>
