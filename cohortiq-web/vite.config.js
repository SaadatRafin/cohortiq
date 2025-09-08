import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
export default defineConfig({
  plugins: [react()],
  base: '/cohortiq-web/', // change to '/<YOUR_REPO>/' if different
})
