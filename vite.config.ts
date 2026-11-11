import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    // Plain class names (e.g. "statValue") so tests can query by them.
    css: { modules: { classNameStrategy: 'non-scoped' } },
  },
})
