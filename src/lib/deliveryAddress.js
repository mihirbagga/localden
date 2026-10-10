/**
 * Delivery address parsing, formatting, and reverse-geocoding utilities.
 */

const MAPS_URL_REGEX = /https?:\/\/(?:maps\.google\.com|www\.google\.com\/maps|maps\.app\.goo\.gl|goo\.gl\/maps)[^\s\]]*/i
const COORDS_REGEX = /q=(-?\d+\.\d+),(-?\d+\.\d+)|@(-?\d+\.\d+),(-?\d+\.\d+)|(-?\d+\.\d+)[,\s]+(-?\d+\.\d+)/

export function parseDeliveryAddress(rawAddress) {
  if (!rawAddress) {
    return {
      raw: '',
      cleanAddress: '',
      mapsUrl: '',
      coords: null,
      coordsLabel: '',
      isGpsPinned: false,
    }
  }

  const raw = String(rawAddress).trim()
  let mapsUrl = ''
  let coords = null

  // 1. Extract Maps URL if present
  const mapMatch = raw.match(MAPS_URL_REGEX)
  if (mapMatch) {
    mapsUrl = mapMatch[0].replace(/[\])>.,]+$/, '') // strip trailing brackets/punctuation
  }

  // 2. Extract Lat/Lng Coordinates
  const targetForCoords = mapsUrl || raw
  const coordMatch = targetForCoords.match(COORDS_REGEX)
  if (coordMatch) {
    const lat = parseFloat(coordMatch[1] || coordMatch[3] || coordMatch[5])
    const lng = parseFloat(coordMatch[2] || coordMatch[4] || coordMatch[6])
    if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
      coords = { lat, lng }
      if (!mapsUrl) {
        mapsUrl = `https://www.google.com/maps?q=${lat},${lng}`
      }
    }
  }

  // 3. Clean human-readable address
  let cleanAddress = raw
    // remove [Map: ...] or (Map: ...) or similar markers
    .replace(/\[\s*Map:\s*https?:\/\/[^\]]+\]/gi, '')
    .replace(/\(\s*Map:\s*https?:\/\/[^)]+\)/gi, '')
    // remove standalone maps URL
    .replace(MAPS_URL_REGEX, '')
    // clean up commas, spacing
    .replace(/\s*,\s*,+/g, ', ')
    .replace(/^\s*,\s*/, '')
    .replace(/\s*,\s*$/, '')
    .trim()

  // If clean address became empty or just "Bangalore" but we have coords
  if (!cleanAddress && coords) {
    cleanAddress = `GPS Location (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})`
  } else if (!cleanAddress) {
    cleanAddress = raw
  }

  const coordsLabel = coords
    ? `${coords.lat.toFixed(4)}° N, ${coords.lng.toFixed(4)}° E`
    : ''

  return {
    raw,
    cleanAddress,
    mapsUrl,
    coords,
    coordsLabel,
    isGpsPinned: Boolean(mapsUrl || coords),
  }
}

export function formatDeliveryAddress({
  flat = '',
  street = '',
  locality = '',
  landmark = '',
  pincode = '',
  mapsUrl = '',
}) {
  const parts = [
    flat.trim(),
    street.trim(),
    locality.trim(),
    landmark.trim() ? `Near ${landmark.trim()}` : '',
    pincode.trim() ? `Bangalore - ${pincode.trim()}` : 'Bangalore',
  ].filter(Boolean)

  const addrString = parts.join(', ')
  if (mapsUrl && mapsUrl.trim()) {
    return `${addrString}, [Map: ${mapsUrl.trim()}]`
  }
  return addrString
}

export async function reverseGeocode(latitude, longitude) {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 6000)

    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`,
      {
        headers: { 'Accept-Language': 'en' },
        signal: controller.signal,
      }
    )
    clearTimeout(timer)

    if (!res.ok) return null
    const data = await res.json()
    const addr = data.address || {}

    const road = addr.road || addr.pedestrian || addr.suburb || addr.neighbourhood || ''
    const sub = addr.suburb || addr.neighbourhood || addr.residential || addr.quarter || ''
    const pin = addr.postcode || ''
    const city = addr.city || addr.town || addr.state_district || 'Bangalore'

    return {
      road,
      locality: sub,
      pincode: pin,
      city,
      displayName: data.display_name || '',
    }
  } catch (err) {
    console.warn('Reverse geocoding failed (fallback to coordinates):', err?.message)
    return null
  }
}

