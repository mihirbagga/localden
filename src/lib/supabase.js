import { createClient } from '@supabase/supabase-js'

function normalizeUrl(url) {
  return String(url || '')
    .trim()
    .replace(/\/+$/, '')
    .replace(/\/rest\/v1$/i, '')
}

function resolveSupabaseUrl() {
  const raw = normalizeUrl(import.meta.env.VITE_SUPABASE_URL)
  if (!raw) return ''
  // Dev: same-origin proxy. Avoids browser CORS on REST/Auth/Realtime.
  if (import.meta.env.DEV && typeof window !== 'undefined') {
    return `${window.location.origin}/__supabase`
  }
  return raw
}

const supabaseUrl = resolveSupabaseUrl()
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.warn(
    '⚠️  Supabase env vars missing. Copy .env.local.example → .env.local and fill in your keys.\n' +
    '   Get them from: supabase.com → Your Project → Settings → API'
  )
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseKey || 'placeholder-key',
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  }
)
