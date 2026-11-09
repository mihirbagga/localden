/**
 * In dev the Supabase client talks to a same-origin proxy (`/__supabase`), so
 * `getPublicUrl()` returns `http://localhost:5173/__supabase/storage/...`.
 * Saving that into the DB breaks images for everyone else (and after deploy).
 * These helpers always turn such URLs into the real, public Supabase URL.
 */
export function realSupabaseUrl() {
  return String(import.meta.env.VITE_SUPABASE_URL || '')
    .trim()
    .replace(/\/+$/, '')
    .replace(/\/rest\/v1$/i, '')
}

export function toPublicStorageUrl(url) {
  if (!url || typeof url !== 'string') return url || ''
  let clean = url.trim().replace(/^["']|["']$/g, '').replace(/\\"/g, '"')
  if (!clean) return ''

  // Already a local public asset (e.g. /hero/ps5.png)
  if (clean.startsWith('/') && !clean.startsWith('/__supabase/') && !clean.startsWith('/storage/')) {
    return clean
  }

  // Protocol relative
  if (clean.startsWith('//')) {
    return `https:${clean}`
  }

  const base = realSupabaseUrl()

  // Dev proxy marker: /__supabase/
  const marker = '/__supabase/'
  const idx = clean.indexOf(marker)
  if (idx !== -1 && base) {
    return `${base}/${clean.slice(idx + marker.length)}`
  }

  // Localhost storage direct URL
  const storageMarker = '/storage/v1/object/public/'
  const storageIdx = clean.indexOf(storageMarker)
  if (storageIdx !== -1 && base) {
    if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//i.test(clean) || clean.startsWith('/storage/')) {
      return `${base}${clean.slice(storageIdx)}`
    }
  }

  // Relative Supabase storage path: e.g. listings/... or listing-photos/...
  if (base && !clean.startsWith('http://') && !clean.startsWith('https://')) {
    if (clean.startsWith('listing-photos/')) {
      return `${base}/storage/v1/object/public/${clean}`
    }
    if (clean.startsWith('listings/')) {
      return `${base}/storage/v1/object/public/listing-photos/${clean}`
    }
  }

  return clean
}
