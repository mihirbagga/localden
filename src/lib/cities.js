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

// Global cache for dynamically configured operational cities
let dynamicCities = null

export function setGlobalCities(citiesList) {
  if (Array.isArray(citiesList) && citiesList.length > 0) {
    dynamicCities = citiesList.map((c) => ({
      id: c.id,
      name: c.name,
      displayName: c.display_name || c.displayName || c.name,
      shortName: c.short_name || c.shortName || c.name,
      state: c.state || '',
      popularLocalities: Array.isArray(c.popular_localities)
        ? c.popular_localities
        : (Array.isArray(c.popularLocalities) ? c.popularLocalities : []),
      isActive: c.is_active !== false && c.isActive !== false,
    }))
  }
}

export function getGlobalCities() {
  if (dynamicCities && dynamicCities.length > 0) {
    return dynamicCities
  }
  return CITIES
}

const CITY_ALIASES = {
  Bengaluru: ['bengaluru', 'bangalore', 'blr', 'karnataka'],
  Gurugram: ['gurugram', 'gurgaon', 'ggn', 'haryana', 'ncr'],
  Mumbai: ['mumbai', 'bombay', 'maharashtra'],
  Delhi: ['delhi', 'new delhi', 'ncr'],
  Hyderabad: ['hyderabad', 'secunderabad', 'telangana'],
  Pune: ['pune', 'poona', 'maharashtra'],
  Chennai: ['chennai', 'madras', 'tamil nadu'],
  Kolkata: ['kolkata', 'calcutta', 'west bengal'],
  Ahmedabad: ['ahmedabad', 'amdavad', 'gujarat'],
}

/**
 * Determine which city a locality or address string belongs to.
 */
export function getCityForLocation(locName = '', customCities = null) {
  if (!locName) return 'Bengaluru'
  const str = String(locName).toLowerCase()

  const citiesPool = (customCities && customCities.length > 0)
    ? customCities
    : getGlobalCities()

  const activePool = citiesPool.filter((c) => c.is_active !== false && c.isActive !== false)
  const candidatePool = activePool.length > 0 ? activePool : citiesPool

  // 1. Direct name or alias match
  for (const c of candidatePool) {
    const cName = (c.name || '').toLowerCase()
    const cDisplay = (c.displayName || c.display_name || '').toLowerCase()
    const cShort = (c.shortName || c.short_name || '').toLowerCase()
    if (str.includes(cName) || (cShort && str.includes(cShort)) || (cDisplay && str.includes(cDisplay))) {
      return c.name
    }
    const aliases = CITY_ALIASES[c.name] || []
    for (const alias of aliases) {
      if (str.includes(alias)) {
        return c.name
      }
    }
  }

  // 2. Locality match across popularLocalities
  for (const c of candidatePool) {
    const locs = c.popularLocalities || c.popular_localities || []
    for (const loc of locs) {
      if (loc && str.includes(String(loc).toLowerCase())) {
        return c.name
      }
    }
  }

  return candidatePool[0]?.name || 'Bengaluru'
}

/**
 * Formats a location string nicely with its city (avoids duplicates).
 * e.g. "Koramangala" -> "Koramangala, Bengaluru"
 * e.g. "Cyber City" -> "Cyber City, Gurugram"
 * e.g. "DLF Phase 2, Gurugram" -> "DLF Phase 2, Gurugram"
 */
export function formatLocationDisplay(location = '', customCities = null) {
  if (!location) return 'Bengaluru & Gurugram'
  const city = getCityForLocation(location, customCities)
  const locLower = location.toLowerCase()
  const cityLower = city.toLowerCase()

  const aliases = [cityLower, ...(CITY_ALIASES[city] || [])]
  const alreadyHasCity = aliases.some((a) => locLower.includes(a))

  if (alreadyHasCity) {
    return location
  }

  return `${location}, ${city}`
}
