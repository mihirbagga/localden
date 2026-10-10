/**
 * In dev the Supabase client talks to a same-origin proxy (`/__supabase`), so
 * `getPublicUrl()` returns `http://localhost:5173/__supabase/storage/...`.
 * Saving that into the DB breaks images for everyone else (and after deploy).
 * These helpers always turn such URLs into the real, public Supabase URL.
 */
function realSupabaseUrl() {
  return String(import.meta.env.VITE_SUPABASE_URL || '')
    .trim()
    .replace(/\/+$/, '')
    .replace(/\/rest\/v1$/i, '')
}

export function toPublicStorageUrl(url) {
  if (!url || typeof url !== 'string') return url || ''
  const base = realSupabaseUrl()
  const marker = '/__supabase/'
  const idx = url.indexOf(marker)
  if (idx === -1 || !base) return url
  return `${base}/${url.slice(idx + marker.length)}`
}

