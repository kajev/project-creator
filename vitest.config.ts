import { resolve } from 'node:path'
import { defineConfig } from 'vitest/config'

// Unit tests only. Vitest does not read electron.vite.config.ts, so the aliases are repeated here.
export default defineConfig({
  resolve: {
    alias: {
      '@shared': resolve('src/shared'),
      '@renderer': resolve('src/renderer/src')
    }
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts']
  }
})
