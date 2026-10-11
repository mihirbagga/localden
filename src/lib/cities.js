/**
 * Central configuration for cities & localities where LocalDen operates.
 */

export const CITIES = [
  {
    id: 'bengaluru',
    name: 'Bengaluru',
    displayName: 'Bengaluru (Bangalore)',
    shortName: 'Bengaluru',
    state: 'Karnataka',
    popularLocalities: [
      'Koramangala',
      'Indiranagar',
      'HSR Layout',
      'Whitefield',
      'BTM Layout',
      'Jayanagar',
      'JP Nagar',
      'Bellandur',
      'Marathahalli',
      'Electronic City',
      'Sadashivanagar',
      'Malleshwaram',
      'Hebbal',
    ],
  },
  {
    id: 'gurugram',
    name: 'Gurugram',
    displayName: 'Gurugram (Gurgaon)',
    shortName: 'Gurugram',
    state: 'Haryana / NCR',
    popularLocalities: [
      'Cyber City',
      'DLF Phase 1',
      'DLF Phase 2',
      'DLF Phase 3',
      'DLF Phase 4',
      'DLF Phase 5',
      'Golf Course Road',
      'Golf Course Ext Road',
      'Sector 29',
      'Sector 56',
      'Sector 57',
      'Sohna Road',
      'MG Road',
      'Sushant Lok',
      'Nirvana Country',
      'South City',
    ],
  },
]

export const ALL_CITY_NAMES = CITIES.map((c) => c.name)

export const BENGALURU_LOCALITIES = CITIES.find((c) => c.id === 'bengaluru').popularLocalities
export const GURUGRAM_LOCALITIES = CITIES.find((c) => c.id === 'gurugram').popularLocalities

export const ALL_LOCALITIES = [
  ...BENGALURU_LOCALITIES,
  ...GURUGRAM_LOCALITIES,
]

/**
 * Determine which city a locality belongs to.
 */
export function getCityForLocation(locName = '') {
  if (!locName) return 'Bengaluru'
  const str = String(locName).toLowerCase()

  if (str.includes('gurugram') || str.includes('gurgaon') || str.includes('haryana') || str.includes('ncr')) {
    return 'Gurugram'
  }
  for (const loc of GURUGRAM_LOCALITIES) {
    if (str.includes(loc.toLowerCase())) {
      return 'Gurugram'
    }
  }

  if (str.includes('bengaluru') || str.includes('bangalore') || str.includes('karnataka')) {
    return 'Bengaluru'
  }
  for (const loc of BENGALURU_LOCALITIES) {
    if (str.includes(loc.toLowerCase())) {
      return 'Bengaluru'
    }
  }

  return 'Bengaluru'
}

/**
 * Formats a location string nicely with its city (avoids duplicates).
 * e.g. "Koramangala" -> "Koramangala, Bengaluru"
 * e.g. "Cyber City" -> "Cyber City, Gurugram"
 * e.g. "DLF Phase 2, Gurugram" -> "DLF Phase 2, Gurugram"
 */
export function formatLocationDisplay(location = '') {
  if (!location) return 'Bengaluru & Gurugram'
  const city = getCityForLocation(location)
  const locLower = location.toLowerCase()
  const cityLower = city.toLowerCase()

  if (locLower.includes(cityLower) || (city === 'Bengaluru' && locLower.includes('bangalore'))) {
    return location
  }

  return `${location}, ${city}`
}
