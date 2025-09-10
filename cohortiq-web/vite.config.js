import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/cohortiq/',     // keep whatever you already set
  build: { sourcemap: true } // <— add this
})