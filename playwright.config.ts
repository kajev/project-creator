import { defineConfig } from '@playwright/test'

// End-to-end tests drive the production build in out/, so run `npm run test:e2e` (it builds first).
export default defineConfig({
  testDir: 'e2e',
  outputDir: 'test-results',
  workers: 1,
  timeout: 60_000,
  reporter: 'list'
})
