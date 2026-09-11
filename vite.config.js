import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

function supabaseProxy(target) {
  if (!target) return undefined
  return {
    '/__supabase': {
      target,
      changeOrigin: true,
      secure: true,
      ws: true,
      rewrite: (path) => path.replace(/^\/__supabase/, ''),
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const target = String(env.VITE_SUPABASE_URL || '').trim().replace(/\/+$/, '')

  return {
    plugins: [react()],
    server: { proxy: supabaseProxy(target) },
    preview: { proxy: supabaseProxy(target) },
  }
})
