<!-- CommonTiptapViewer.vue -->
<template>
  <!-- read-only output. Safe to use v-html here: renderNode escapes all text
       via escapeHtml and only emits a fixed set of hardcoded tags (<p>, <br />). -->
  <!-- eslint-disable vue/no-v-html -->
  <div
    v-if="html"
    class="p-1 pl-3 group w-full whitespace-pre-wrap break-words"
    v-html="html"
  />
  <!-- eslint-enable vue/no-v-html -->
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { JSONContent } from '@tiptap/core'

const props = defineProps<{
  doc: JSONContent | null | undefined
}>()

const escapeHtml = (str: string): string =>
  str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

function renderNode(node?: JSONContent): string {
  if (!node) return ''

  const children = (node.content ?? []).map(renderNode).join('')

  switch (node.type) {
    case 'doc':
      return children

    case 'paragraph':
      // empty paragraph → visual empty line
      return children ? `<p>${children}</p>` : '<p><br /></p>'

    case 'text': {
      const text = escapeHtml(node.text ?? '')
      // if you need marks later (bold, italic, etc.), handle here
      return text
    }

    case 'hardBreak':
      return '<br />'

    default:
      // unknown node → just render its children
      return children
  }
}

const html = computed(() => (props.doc ? renderNode(props.doc) : ''))
</script>
