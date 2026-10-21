/**
 * Delivery address parsing, formatting, and reverse-geocoding utilities.
 */

import { getCityForLocation, ALL_LOCALITIES } from './cities'

const MAPS_URL_REGEX = /https?:\/\/(?:maps\.google\.com|www\.google\.com\/maps|maps\.app\.goo\.gl|goo\.gl\/maps)[^\s\]]*/i
const COORDS_REGEX = /q=(-?\d+\.\d+),(-?\d+\.\d+)|@(-?\d+\.\d+),(-?\d+\.\d+)|(-?\d+\.\d+)[,\s]+(-?\d+\.\d+)/
const SLOT_TAG_REGEX = /\[\s*Slot:\s*([^\]]+)\]/i
const NOTE_TAG_REGEX = /\[\s*Note:\s*([^\]]+)\]/i

export function parseDeliveryAddress(rawAddress) {
  if (!rawAddress) {
    return {
      raw: '',
      cleanAddress: '',
      mapsUrl: '',
      coords: null,
      coordsLabel: '',
      slot: '',
      instructions: '',
      pincode: '',
      locality: '',
      isGpsPinned: false,
    }
  }

  const raw = String(rawAddress).trim()
  let mapsUrl = ''
  let coords = null
  let slot = ''
  let instructions = ''

  // 1. Extract Maps URL if present
  const mapMatch = raw.match(MAPS_URL_REGEX)
  if (mapMatch) {
    mapsUrl = mapMatch[0].replace(/[\])>.,]+$/, '')
  }

  // 2. Extract Slot and Instructions tags if present
  const slotMatch = raw.match(SLOT_TAG_REGEX)
  if (slotMatch) slot = slotMatch[1].trim()

  const noteMatch = raw.match(NOTE_TAG_REGEX)
  if (noteMatch) instructions = noteMatch[1].trim()

  // 3. Extract Lat/Lng Coordinates
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

  // 4. Clean human-readable address
  let cleanAddress = raw
    .replace(/\[\s*Map:\s*https?:\/\/[^\]]+\]/gi, '')
    .replace(/\(\s*Map:\s*https?:\/\/[^)]+\)/gi, '')
    .replace(SLOT_TAG_REGEX, '')
    .replace(NOTE_TAG_REGEX, '')
    .replace(MAPS_URL_REGEX, '')
    .replace(/\s*,\s*,+/g, ', ')
    .replace(/^\s*,\s*/, '')
    .replace(/\s*,\s*$/, '')
    .trim()

  const lower = cleanAddress.toLowerCase()
  if ((!cleanAddress || lower === 'bangalore' || lower === 'bengaluru' || lower === 'gurugram' || lower === 'gurgaon') && coords) {
    cleanAddress = `GPS Location (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})`
  } else if (!cleanAddress) {
    cleanAddress = raw
  }

  const pinMatch = cleanAddress.match(/\b(\d{6})\b/)
  const pincode = pinMatch ? pinMatch[1] : ''

  let locality = ''
  for (const loc of ALL_LOCALITIES) {
    if (lower.includes(loc.toLowerCase())) {
      locality = loc
      break
    }
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
    slot,
    instructions,
    pincode,
    locality,
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
  slot = '',
  instructions = '',
  city = '',
}) {
  const hasAny =
    flat.trim() ||
    street.trim() ||
    locality.trim() ||
    landmark.trim() ||
    pincode.trim() ||
    mapsUrl.trim()
  if (!hasAny) return ''

  const detectedCity = city || (locality ? getCityForLocation(locality) : (pincode.startsWith('122') ? 'Gurugram' : 'Bengaluru'))
  const cityPin = pincode.trim() ? `${detectedCity} - ${pincode.trim()}` : detectedCity

  const parts = [
    flat.trim(),
    street.trim(),
    locality.trim(),
    landmark.trim() ? `Near ${landmark.trim()}` : '',
    cityPin,
  ].filter(Boolean)

  let out = parts.join(', ')
  if (slot && slot.trim()) {
    out += `, [Slot: ${slot.trim()}]`
  }
  if (instructions && instructions.trim()) {
    out += `, [Note: ${instructions.trim().replace(/[\[\]]/g, '')}]`
  }
  if (mapsUrl && mapsUrl.trim()) {
    out += `, [Map: ${mapsUrl.trim()}]`
  }
  return out
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
    const city = addr.city || addr.town || addr.state_district || 'Bengaluru'

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
