import { toPublicStorageUrl } from './storageUrl'

/**
 * Curated local hero fallback photos for known gaming & music categories.
 */
export const CATEGORY_FALLBACK_PHOTOS = {
  // Gaming
  'Console': '/hero/ps5.png',
  'PS5': '/hero/ps5.png',
  'PlayStation': '/hero/ps5.png',
  'Xbox': '/hero/xbox.png',
  'Controller': '/hero/xbox.png',
  'VR Headset': '/hero/vr.png',
  'Gaming Mouse': '/hero/xbox.png',
  'Racing Wheel': '/hero/ps5.png',
  'gaming': '/hero/ps5.png',

  // Music
  'Guitar': '/hero/guitar.png',
  'Bass': '/hero/guitar.png',
  'Piano / Keyboard': '/hero/guitar.png',
  'Drums': '/hero/dj.png',
  'DJ Controller': '/hero/dj.png',
  'Microphone': '/hero/mic.png',
  'Amplifier': '/hero/dj.png',
  'Synthesizer': '/hero/dj.png',
  'music': '/hero/guitar.png',
}

/**
 * Returns a high-res category fallback photo for items with no uploaded photos or broken photos.
 */
export function getDefaultPhotoForListing(listing = {}) {
  const sub = String(listing.subcategory || '').trim()
  const title = String(listing.title || '').toLowerCase()
  const cat = String(listing.category || '').toLowerCase().trim()

  if (title.includes('ps5') || title.includes('playstation') || title.includes('gta 6') || title.includes('gta6')) {
    return '/hero/ps5.png'
  }
  if (title.includes('xbox') || title.includes('controller') || sub.toLowerCase().includes('controller')) {
    return '/hero/xbox.png'
  }
  if (title.includes('vr') || sub.toLowerCase().includes('vr')) {
    return '/hero/vr.png'
  }
  if (title.includes('guitar') || title.includes('bass') || sub.toLowerCase().includes('guitar') || sub.toLowerCase().includes('bass')) {
    return '/hero/guitar.png'
  }
  if (title.includes('dj') || sub.toLowerCase().includes('dj')) {
    return '/hero/dj.png'
  }
  if (title.includes('mic') || sub.toLowerCase().includes('mic')) {
    return '/hero/mic.png'
  }

  if (CATEGORY_FALLBACK_PHOTOS[sub]) {
    return CATEGORY_FALLBACK_PHOTOS[sub]
  }

  if (cat === 'gaming') return '/hero/ps5.png'
  if (cat === 'music') return '/hero/guitar.png'

  return null
}

/**
 * Parses raw photos into an array of clean strings.
 * Handles:
 * - Native Array
 * - JSON encoded string: '["https://..."]'
 * - Postgres text array string: '{"https://...","https://..."}'
 * - Comma-separated or single URL string
 */
function parseRawPhotos(raw) {
  if (!raw) return []

  if (Array.isArray(raw)) {
    return raw.flat().filter(Boolean)
  }

  if (typeof raw === 'string') {
    const trimmed = raw.trim()
    if (!trimmed || trimmed === '{}' || trimmed === '[]' || trimmed === '""') {
      return []
    }

    // JSON array
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        const parsed = JSON.parse(trimmed)
        if (Array.isArray(parsed)) return parsed.filter(Boolean)
      } catch { /* continue to regex/split */ }
    }

    // Postgres array format: {url1, url2}
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      const inner = trimmed.slice(1, -1).trim()
      if (!inner) return []
      // Match comma-separated values, respecting quotes
      const matches = inner.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g)
      if (matches && matches.length > 0) {
        return matches.map((m) => m.replace(/^"|"$/g, '').trim()).filter(Boolean)
      }
      return inner.split(',').map((s) => s.replace(/^"|"$/g, '').trim()).filter(Boolean)
    }

    // Single URL or path
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('/') || trimmed.startsWith('listings/')) {
      return [trimmed]
    }

    // Comma-separated URLs
    if (trimmed.includes(',')) {
      return trimmed.split(',').map((s) => s.replace(/^["']|["']$/g, '').trim()).filter(Boolean)
    }

    return [trimmed]
  }

  return []
}

/**
 * Extracts and sanitizes all valid photo URLs for a listing.
 */
export function getListingPhotos(listing = {}) {
  if (!listing) return []

  const rawList = parseRawPhotos(
    listing.photos ||
    listing.photo_urls ||
    listing.photo_url ||
    listing.image_url ||
    listing.image ||
    listing.cover_photo ||
    listing.cover_url ||
    listing.photo
  )

  const cleaned = []
  for (const item of rawList) {
    if (!item || typeof item !== 'string') continue
    const unquoted = item.trim().replace(/^["']|["']$/g, '').trim()
    if (!unquoted || unquoted === 'null' || unquoted === 'undefined' || unquoted === '{}' || unquoted === '[]') {
      continue
    }
    const publicUrl = toPublicStorageUrl(unquoted)
    if (publicUrl && !cleaned.includes(publicUrl)) {
      cleaned.push(publicUrl)
    }
  }

  return cleaned
}

/**
 * Returns the primary (hero) photo URL, with optional fallback to curated category photo.
 * @param {Object} listing
 * @param {boolean} withCategoryFallback - whether to return category hero image if listing has no photos
 */
export function getListingHeroPhoto(listing = {}, withCategoryFallback = true) {
  const photos = getListingPhotos(listing)
  if (photos.length > 0) {
    return photos[0]
  }
  if (withCategoryFallback) {
    return getDefaultPhotoForListing(listing)
  }
  return null
}

