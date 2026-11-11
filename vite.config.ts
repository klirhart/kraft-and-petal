import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

const DEV_PORT = 4387
const PREVIEW_PORT = 4388

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  // Host 0.0.0.0 so Cursor's port preview can reach the server from outside the VM.
  server: { host: '0.0.0.0', port: DEV_PORT, strictPort: true },
  preview: { host: '0.0.0.0', port: PREVIEW_PORT, strictPort: true },
  test: {
    environment: 'jsdom',
    include: ['tests/{unit,a11y,database}/**/*.test.{ts,tsx}'],
    setupFiles: ['tests/setup.ts'],
    css: { modules: { classNameStrategy: 'non-scoped' } },
    restoreMocks: true,
    testTimeout: 20_000,
  },
})
