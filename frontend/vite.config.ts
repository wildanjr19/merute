import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  // Tujuan proxy untuk /api dan /health saat dev/preview lokal.
  // Di produksi, reverse proxy (OpenResty/1Panel) yang meneruskan ke backend,
  // sehingga frontend cukup memakai path relatif (same-origin).
  const apiTarget = env.VITE_DEV_API_PROXY || 'http://localhost:8001'

  const proxy = {
    '/api': { target: apiTarget, changeOrigin: true },
    '/health': { target: apiTarget, changeOrigin: true },
  }

  return {
    plugins: [react()],
    server: { proxy },
    preview: { proxy },
  }
})
