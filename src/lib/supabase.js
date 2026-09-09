import { createClient } from '@supabase/supabase-js'

const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL
const supabaseKey  = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.warn(
    '⚠️  Supabase env vars missing. Copy .env.local.example → .env.local and fill in your keys.\n' +
    '   Get them from: supabase.com → Your Project → Settings → API'
  )
}

export const supabase = createClient(
  supabaseUrl  || 'https://placeholder.supabase.co',
  supabaseKey  || 'placeholder-key',
  {
    auth: {
      autoRefreshToken:  true,
      persistSession:    true,
      detectSessionInUrl: true,
    },
  }
)
