import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// VITE_BASE_PATH is set at build time for GitHub Pages deployment.
// Local dev:       VITE_BASE_PATH is unset → base defaults to '/'
// GitHub Pages:    VITE_BASE_PATH=/skill-share/ (set in predeploy script)
const base = process.env.VITE_BASE_PATH ?? '/'

export default defineConfig({
  plugins: [react()],
  base,
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Keep Supabase in its own chunk to avoid the main bundle growing too large
          supabase: ['@supabase/supabase-js'],
        },
      },
    },
  },
})
