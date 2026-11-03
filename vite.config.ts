import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'node:path'

// GitHub Pages project sites are served from https://<user>.github.io/<repo>/
// so Vite needs base="/<repo>/". The deploy workflow sets VITE_BASE_PATH from
// the real repository name, so renaming the repo needs no code change.
// Local dev and `vite preview` fall back to "/".
const base = process.env.VITE_BASE_PATH ?? '/'

export default defineConfig({
  base,
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
