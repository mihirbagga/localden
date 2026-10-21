/**
 * Warehouse Location & Distance-based Delivery Fee Calculation Engine.
 * Supports configurable warehouse hubs (Bengaluru & Gurugram), listing locality origin,
 * GPS haversine distance, pincode resolution, and locality fallbacks.
 */

import { supabase } from './supabase'
import { parseDeliveryAddress } from './deliveryAddress'
import { getCityForLocation } from './cities'

export const WAREHOUSE_SETTINGS_KEY = 'warehouse_delivery_settings'

export const DEFAULT_WAREHOUSE_SETTINGS = {
  warehouse_name: 'LocalDen Koramangala Hub',
  warehouse_address: '4th Block, Koramangala, Bengaluru, Karnataka 560034',
  warehouse_lat: 12.9352,
  warehouse_lng: 77.6245,
  gurugram_warehouse_name: 'LocalDen CyberHub Dispatch',
  gurugram_warehouse_address: 'DLF Cyber City, Phase 2, Gurugram, Haryana 122002',
  gurugram_warehouse_lat: 28.4952,
  gurugram_warehouse_lng: 77.0895,
  base_fee: 99,              // Base delivery fee in ₹
  base_km_included: 3,       // Km included in base fee
  per_km_rate: 15,           // ₹ per additional km beyond base_km
  min_fee: 49,
  max_fee: 499,
  max_service_km: 35,        // Maximum serviceable driving distance
  free_delivery_above: 3500, // ₹0 to disable free delivery
  print_note: 'Verified & Sanitized with Anti-Static Packaging · Tested Before Dispatch',
}

// Reference coordinates for major localities in Bengaluru & Gurugram
export const LOCALITY_COORDS = {
  // Bengaluru
  koramangala: { lat: 12.9352, lng: 77.6245, city: 'Bengaluru', label: 'Koramangala' },
  hsr: { lat: 12.9121, lng: 77.6446, city: 'Bengaluru', label: 'HSR Layout' },
  'hsr layout': { lat: 12.9121, lng: 77.6446, city: 'Bengaluru', label: 'HSR Layout' },
  indiranagar: { lat: 12.9784, lng: 77.6408, city: 'Bengaluru', label: 'Indiranagar' },
  whitefield: { lat: 12.9698, lng: 77.7500, city: 'Bengaluru', label: 'Whitefield' },
  'btm layout': { lat: 12.9166, lng: 77.6101, city: 'Bengaluru', label: 'BTM Layout' },
  btm: { lat: 12.9166, lng: 77.6101, city: 'Bengaluru', label: 'BTM Layout' },
  jayanagar: { lat: 12.9308, lng: 77.5838, city: 'Bengaluru', label: 'Jayanagar' },
  'jp nagar': { lat: 12.9063, lng: 77.5857, city: 'Bengaluru', label: 'JP Nagar' },
  bellandur: { lat: 12.9304, lng: 77.6784, city: 'Bengaluru', label: 'Bellandur' },
  marathahalli: { lat: 12.9591, lng: 77.6974, city: 'Bengaluru', label: 'Marathahalli' },
  'electronic city': { lat: 12.8452, lng: 77.6602, city: 'Bengaluru', label: 'Electronic City' },
  sadashivanagar: { lat: 13.0068, lng: 77.5813, city: 'Bengaluru', label: 'Sadashivanagar' },
  malleshwaram: { lat: 13.0031, lng: 77.5703, city: 'Bengaluru', label: 'Malleshwaram' },
  hebbal: { lat: 13.0358, lng: 77.5970, city: 'Bengaluru', label: 'Hebbal' },
  sarjapur: { lat: 12.9010, lng: 77.6874, city: 'Bengaluru', label: 'Sarjapur Road' },
  yelahanka: { lat: 13.1007, lng: 77.5963, city: 'Bengaluru', label: 'Yelahanka' },
  banashankari: { lat: 12.9255, lng: 77.5468, city: 'Bengaluru', label: 'Banashankari' },
  rajajinagar: { lat: 12.9906, lng: 77.5526, city: 'Bengaluru', label: 'Rajajinagar' },
  'mg road bangalore': { lat: 12.9756, lng: 77.6066, city: 'Bengaluru', label: 'MG Road' },

  // Gurugram
  'cyber city': { lat: 28.4952, lng: 77.0895, city: 'Gurugram', label: 'Cyber City' },
  'dlf phase 1': { lat: 28.4795, lng: 77.0970, city: 'Gurugram', label: 'DLF Phase 1' },
  'dlf phase 2': { lat: 28.4870, lng: 77.0870, city: 'Gurugram', label: 'DLF Phase 2' },
  'dlf phase 3': { lat: 28.4980, lng: 77.0980, city: 'Gurugram', label: 'DLF Phase 3' },
  'dlf phase 4': { lat: 28.4680, lng: 77.0870, city: 'Gurugram', label: 'DLF Phase 4' },
  'dlf phase 5': { lat: 28.4550, lng: 77.0950, city: 'Gurugram', label: 'DLF Phase 5' },
  'golf course road': { lat: 28.4590, lng: 77.1020, city: 'Gurugram', label: 'Golf Course Road' },
  'golf course ext road': { lat: 28.4150, lng: 77.0850, city: 'Gurugram', label: 'Golf Course Ext Road' },
  'sector 29': { lat: 28.4682, lng: 77.0628, city: 'Gurugram', label: 'Sector 29' },
  'sector 56': { lat: 28.4285, lng: 77.1005, city: 'Gurugram', label: 'Sector 56' },
  'sector 57': { lat: 28.4230, lng: 77.0830, city: 'Gurugram', label: 'Sector 57' },
  'sohna road': { lat: 28.4110, lng: 77.0420, city: 'Gurugram', label: 'Sohna Road' },
  'mg road': { lat: 28.4790, lng: 77.0800, city: 'Gurugram', label: 'MG Road' },
  'sushant lok': { lat: 28.4650, lng: 77.0780, city: 'Gurugram', label: 'Sushant Lok' },
  'nirvana country': { lat: 28.4162, lng: 77.0686, city: 'Gurugram', label: 'Nirvana Country' },
  'south city': { lat: 28.4505, lng: 77.0652, city: 'Gurugram', label: 'South City' },
}

// Pincode lookup table for instant locality + coordinate detection
export const PINCODE_MAP = {
  // Bengaluru
  '560001': { locality: 'MG Road', city: 'Bengaluru', lat: 12.9756, lng: 77.6066 },
  '560003': { locality: 'Malleshwaram', city: 'Bengaluru', lat: 13.0031, lng: 77.5703 },
  '560008': { locality: 'Indiranagar', city: 'Bengaluru', lat: 12.9719, lng: 77.6412 },
  '560010': { locality: 'Rajajinagar', city: 'Bengaluru', lat: 12.9906, lng: 77.5526 },
  '560011': { locality: 'Jayanagar', city: 'Bengaluru', lat: 12.9308, lng: 77.5838 },
  '560024': { locality: 'Hebbal', city: 'Bengaluru', lat: 13.0358, lng: 77.5970 },
  '560029': { locality: 'BTM Layout', city: 'Bengaluru', lat: 12.9166, lng: 77.6101 },
  '560034': { locality: 'Koramangala', city: 'Bengaluru', lat: 12.9352, lng: 77.6245 },
  '560035': { locality: 'Sarjapur Road', city: 'Bengaluru', lat: 12.9010, lng: 77.6874 },
  '560037': { locality: 'Marathahalli', city: 'Bengaluru', lat: 12.9591, lng: 77.6974 },
  '560038': { locality: 'Indiranagar', city: 'Bengaluru', lat: 12.9784, lng: 77.6408 },
  '560041': { locality: 'Jayanagar', city: 'Bengaluru', lat: 12.9250, lng: 77.5938 },
  '560064': { locality: 'Yelahanka', city: 'Bengaluru', lat: 13.1007, lng: 77.5963 },
  '560066': { locality: 'Whitefield', city: 'Bengaluru', lat: 12.9698, lng: 77.7500 },
  '560070': { locality: 'Banashankari', city: 'Bengaluru', lat: 12.9255, lng: 77.5468 },
  '560076': { locality: 'BTM Layout', city: 'Bengaluru', lat: 12.9120, lng: 77.6050 },
  '560078': { locality: 'JP Nagar', city: 'Bengaluru', lat: 12.9063, lng: 77.5857 },
  '560080': { locality: 'Sadashivanagar', city: 'Bengaluru', lat: 13.0068, lng: 77.5813 },
  '560095': { locality: 'Koramangala', city: 'Bengaluru', lat: 12.9380, lng: 77.6200 },
  '560100': { locality: 'Electronic City', city: 'Bengaluru', lat: 12.8452, lng: 77.6602 },
  '560102': { locality: 'HSR Layout', city: 'Bengaluru', lat: 12.9121, lng: 77.6446 },
  '560103': { locality: 'Bellandur', city: 'Bengaluru', lat: 12.9304, lng: 77.6784 },

  // Gurugram
  '122001': { locality: 'Sector 29', city: 'Gurugram', lat: 28.4682, lng: 77.0628 },
  '122002': { locality: 'DLF Phase 2', city: 'Gurugram', lat: 28.4870, lng: 77.0870 },
  '122003': { locality: 'Sushant Lok', city: 'Gurugram', lat: 28.4580, lng: 77.0810 },
  '122009': { locality: 'DLF Phase 4', city: 'Gurugram', lat: 28.4680, lng: 77.0870 },
  '122010': { locality: 'Cyber City', city: 'Gurugram', lat: 28.4952, lng: 77.0895 },
  '122011': { locality: 'Sector 56', city: 'Gurugram', lat: 28.4285, lng: 77.1005 },
  '122018': { locality: 'Sohna Road', city: 'Gurugram', lat: 28.4110, lng: 77.0420 },
  '122022': { locality: 'Golf Course Road', city: 'Gurugram', lat: 28.4590, lng: 77.1020 },
}

export function lookupPincode(pin = '') {
  const clean = String(pin || '').replace(/\D/g, '')
  if (clean.length !== 6) return null
  if (PINCODE_MAP[clean]) return { pincode: clean, ...PINCODE_MAP[clean] }
  if (clean.startsWith('560')) {
    return { pincode: clean, locality: '', city: 'Bengaluru', lat: 12.9550, lng: 77.6300, approximate: true }
  }
  if (clean.startsWith('122')) {
    return { pincode: clean, locality: '', city: 'Gurugram', lat: 28.4650, lng: 77.0820, approximate: true }
  }
  return { pincode: clean, unsupportedCity: true }
}

/**
 * Calculates driving distance in kilometers between two lat/lng coordinates (Haversine * 1.25 road factor).
 */
export function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 5
  const R = 6371
  const dLat = (lat2 - lat1) * (Math.PI / 180)
  const dLon = (lon2 - lon1) * (Math.PI / 180)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  const drivingDistance = R * c * 1.25
  return Math.round(drivingDistance * 10) / 10
}

/**
 * Resolves coordinates and precision source from an address string or GPS URL.
 */
export function resolveAddressCoords(rawAddress) {
  const parsed = parseDeliveryAddress(rawAddress)
  if (parsed.coords && parsed.coords.lat && parsed.coords.lng) {
    return { ...parsed.coords, precision: 'gps', label: 'Exact GPS Pin' }
  }

  // Check 6-digit pincode in address
  const pinMatch = String(rawAddress || '').match(/\b(\d{6})\b/)
  if (pinMatch) {
    const pinInfo = lookupPincode(pinMatch[1])
    if (pinInfo && !pinInfo.unsupportedCity && pinInfo.lat) {
      // Also check if a more specific locality name appears in the string
      const lower = String(rawAddress || '').toLowerCase()
      for (const [name, coords] of Object.entries(LOCALITY_COORDS)) {
        if (lower.includes(name)) {
          return { ...coords, precision: 'locality', label: coords.label || name }
        }
      }
      return {
        lat: pinInfo.lat,
        lng: pinInfo.lng,
        city: pinInfo.city,
        precision: pinInfo.approximate ? 'city_pin' : 'pincode',
        label: pinInfo.locality ? `${pinInfo.locality} (${pinInfo.pincode})` : `PIN ${pinInfo.pincode}`,
      }
    }
  }

  const lower = String(rawAddress || '').toLowerCase()
  for (const [name, coords] of Object.entries(LOCALITY_COORDS)) {
    if (lower.includes(name)) {
      return { ...coords, precision: 'locality', label: coords.label || name }
    }
  }

  return null
}

/**
 * Resolves the dispatch hub or listing origin coordinates.
 */
function resolveOriginHub({ address, listingLocation, settings }) {
  const s = { ...DEFAULT_WAREHOUSE_SETTINGS, ...settings }
  const addrCity = getCityForLocation(address || listingLocation || '')

  // If the listing itself has a known locality in the same city, or we are in Gurugram
  if (addrCity === 'Gurugram' || getCityForLocation(listingLocation || '') === 'Gurugram') {
    return {
      name: s.gurugram_warehouse_name || 'LocalDen CyberHub Dispatch',
      address: s.gurugram_warehouse_address || 'DLF Cyber City, Gurugram',
      lat: Number(s.gurugram_warehouse_lat) || 28.4952,
      lng: Number(s.gurugram_warehouse_lng) || 77.0895,
      city: 'Gurugram',
    }
  }

  return {
    name: s.warehouse_name || 'LocalDen Koramangala Hub',
    address: s.warehouse_address || '4th Block, Koramangala, Bengaluru',
    lat: Number(s.warehouse_lat) || 12.9352,
    lng: Number(s.warehouse_lng) || 77.6245,
    city: 'Bengaluru',
  }
}

export async function fetchWarehouseSettings() {
  try {
    const { data, error } = await supabase
      .from('site_settings')
      .select('*')
      .or(`id.eq.${WAREHOUSE_SETTINGS_KEY},key.eq.${WAREHOUSE_SETTINGS_KEY}`)
      .maybeSingle()

    if (!error && data?.value && typeof data.value === 'object') {
      return { ...DEFAULT_WAREHOUSE_SETTINGS, ...data.value }
    }
  } catch {
    try {
      const { data: fallback } = await supabase
        .from('site_settings')
        .select('value')
        .eq('id', WAREHOUSE_SETTINGS_KEY)
        .maybeSingle()
      if (fallback?.value && typeof fallback.value === 'object') {
        return { ...DEFAULT_WAREHOUSE_SETTINGS, ...fallback.value }
      }
    } catch {}
  }

  try {
    const cached = localStorage.getItem(`rent_${WAREHOUSE_SETTINGS_KEY}`)
    if (cached) return { ...DEFAULT_WAREHOUSE_SETTINGS, ...JSON.parse(cached) }
  } catch {}

  return DEFAULT_WAREHOUSE_SETTINGS
}

export async function saveWarehouseSettings(settings) {
  const merged = { ...DEFAULT_WAREHOUSE_SETTINGS, ...settings }
  try {
    localStorage.setItem(`rent_${WAREHOUSE_SETTINGS_KEY}`, JSON.stringify(merged))
  } catch {}

  let { error } = await supabase.from('site_settings').upsert({
    id: WAREHOUSE_SETTINGS_KEY,
    value: merged,
    updated_at: new Date().toISOString(),
  })
  if (error && /column "id"/i.test(error.message || '')) {
    const res = await supabase.from('site_settings').upsert({
      key: WAREHOUSE_SETTINGS_KEY,
      value: merged,
      updated_at: new Date().toISOString(),
    })
    error = res.error
  }
  if (error) console.warn('Supabase site_settings save note:', error.message)
  return merged
}

/**
 * Calculates delivery fee, distance, ETA, breakdown, and free-delivery progress.
 */
export function calculateDeliveryFee({
  address = '',
  listingLocation = '',
  orderSubtotal = 0,
  settings = DEFAULT_WAREHOUSE_SETTINGS,
}) {
  const s = { ...DEFAULT_WAREHOUSE_SETTINGS, ...settings }
  const hub = resolveOriginHub({ address, listingLocation, settings: s })

  const userCoords = resolveAddressCoords(address)
  let distanceKm = 4.5
  let precision = 'estimated'
  let resolvedArea = ''

  if (userCoords) {
    precision = userCoords.precision || 'locality'
    resolvedArea = userCoords.label || ''
    // If user coordinates are in a different city than the initial hub guess, switch hub to user's city
    const effectiveHub =
      userCoords.city && userCoords.city !== hub.city
        ? resolveOriginHub({ address: userCoords.city, listingLocation, settings: s })
        : hub
    distanceKm = calculateDistanceKm(
      effectiveHub.lat,
      effectiveHub.lng,
      userCoords.lat,
      userCoords.lng
    )
    hub.name = effectiveHub.name
    hub.address = effectiveHub.address
    hub.city = effectiveHub.city
  }

  const maxServiceKm = Number(s.max_service_km) || 35
  const isServiceable = distanceKm <= maxServiceKm

  const baseFee = Number(s.base_fee) || 99
  const baseKm = Number(s.base_km_included) || 3
  const perKmRate = Number(s.per_km_rate) || 15
  const extraKm = Math.max(0, Math.ceil(distanceKm - baseKm))
  const extraKmCharge = extraKm * perKmRate

  let rawFee = baseFee + extraKmCharge
  rawFee = Math.max(Number(s.min_fee) || 49, Math.min(Number(s.max_fee) || 499, Math.round(rawFee)))

  const freeThreshold = Number(s.free_delivery_above) || 0
  const qualifiesFree = freeThreshold > 0 && orderSubtotal >= freeThreshold
  const freeShortfall = freeThreshold > 0 ? Math.max(0, freeThreshold - orderSubtotal) : 0
  const freeProgressPct = freeThreshold > 0 ? Math.min(100, Math.round((orderSubtotal / freeThreshold) * 100)) : 0

  const etaLabel =
    distanceKm <= 5
      ? '60–90 mins express'
      : distanceKm <= 12
        ? '2–3 hrs same-day'
        : 'Same-day scheduled slot'

  const printNote = `Dispatched from ${hub.name} · ${s.print_note}`

  if (qualifiesFree) {
    return {
      distanceKm,
      deliveryFee: 0,
      originalFee: rawFee,
      isFree: true,
      freeReason: `Free doorstep delivery unlocked (orders ₹${freeThreshold.toLocaleString('en-IN')}+)`,
      freeShortfall: 0,
      freeProgressPct: 100,
      freeThreshold,
      baseFee,
      baseKm,
      extraKm,
      perKmRate,
      extraKmCharge,
      precision,
      resolvedArea,
      isServiceable,
      maxServiceKm,
      etaLabel,
      warehouseName: hub.name,
      warehouseAddress: hub.address,
      printNote,
    }
  }

  return {
    distanceKm,
    deliveryFee: rawFee,
    originalFee: rawFee,
    isFree: false,
    freeReason: '',
    freeShortfall,
    freeProgressPct,
    freeThreshold,
    baseFee,
    baseKm,
    extraKm,
    perKmRate,
    extraKmCharge,
    precision,
    resolvedArea,
    isServiceable,
    maxServiceKm,
    etaLabel,
    warehouseName: hub.name,
    warehouseAddress: hub.address,
    printNote,
  }
}
