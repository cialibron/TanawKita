import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Serve the app at /TanawKita/ (e.g. http://localhost:5173/TanawKita/).
  base: '/TanawKita/',
})
