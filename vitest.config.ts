import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const root = fileURLToPath(new URL('./', import.meta.url))

export default defineConfig({
  resolve: {
    alias: [
      { find: /^~~\//, replacement: root },
      { find: /^~\//, replacement: root },
      { find: /^lodash(?!(-es|\/fp|\.))/, replacement: 'lodash-es' }
    ]
  },
  test: {
    server: { deps: { inline: [/@speckle\/ui-components/] } },
    include: ['**/*.test.ts'],
    exclude: ['**/node_modules/**', '.nuxt/**', '.output/**', '.worktrees/**']
  }
})
