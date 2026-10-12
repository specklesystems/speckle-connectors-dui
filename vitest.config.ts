import { defineConfig } from 'vitest/config'

// Unit tests only cover framework-free modules under lib/, so no Nuxt environment
// is booted: keep test modules free of `~/` imports and browser globals.
export default defineConfig({
  test: {
    include: ['lib/**/*.test.ts'],
    environment: 'node'
  }
})
