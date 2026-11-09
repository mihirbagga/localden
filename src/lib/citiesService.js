import { supabase } from './supabase'
import { CITIES as FALLBACK_CITIES, setGlobalCities } from './cities'

let cachedCities = null

export function normalizeCityData(c) {
  const popularLocalities = Array.isArray(c.popular_localities)
    ? c.popular_localities
    : (Array.isArray(c.popularLocalities)
        ? c.popularLocalities
        : (typeof c.popular_localities === 'string'
            ? c.popular_localities.split(',').map((s) => s.trim()).filter(Boolean)
            : []))

  const displayName = c.display_name || c.displayName || c.name || ''
  const shortName = c.short_name || c.shortName || c.name || ''
  const isActive = c.is_active !== false && c.isActive !== false

  return {
    id: c.id || String(c.name || '').trim().toLowerCase().replace(/[^a-z0-9]/g, ''),
    name: c.name,
    displayName,
    display_name: displayName,
    shortName,
    short_name: shortName,
    state: c.state || '',
    popularLocalities,
    popular_localities: popularLocalities,
    isActive,
    is_active: isActive,
    created_at: c.created_at,
    updated_at: c.updated_at,
  }
}

/**
 * Fetch all cities from Supabase (falls back to local static cities if table not yet migrated)
 */
export async function fetchCities(force = false) {
  if (!force && cachedCities) {
    return cachedCities
  }

  try {
    const { data, error } = await supabase
      .from('cities')
      .select('*')
      .order('name', { ascending: true })

    if (error || !data || data.length === 0) {
      const fallback = FALLBACK_CITIES.map(normalizeCityData)
      cachedCities = fallback
      setGlobalCities(fallback)
      return fallback
    }

    const normalized = data.map(normalizeCityData)
    cachedCities = normalized
    setGlobalCities(normalized)
    return normalized
  } catch (err) {
    console.warn('Using fallback cities due to error:', err)
    const fallback = FALLBACK_CITIES.map(normalizeCityData)
    cachedCities = fallback
    setGlobalCities(fallback)
    return fallback
  }
}

function notifyCitiesChanged(payload) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('cities:changed', { detail: payload }))
  }
}

export function subscribeCities(cb) {
  if (typeof window === 'undefined') return () => {}
  const handler = (e) => cb(e.detail)
  window.addEventListener('cities:changed', handler)
  return () => window.removeEventListener('cities:changed', handler)
}

/**
 * Add a new operational city
 */
export async function createCity(city) {
  const id = String(city.name || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '')
  const localities = Array.isArray(city.popular_localities)
    ? city.popular_localities
    : String(city.popular_localities || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)

  const payload = {
    id,
    name: city.name.trim(),
    display_name: city.display_name?.trim() || city.displayName?.trim() || city.name.trim(),
    short_name: city.short_name?.trim() || city.shortName?.trim() || city.name.trim(),
    state: city.state?.trim() || 'India',
    popular_localities: localities,
    is_active: typeof city.is_active === 'boolean' ? city.is_active : true,
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from('cities')
    .upsert(payload)
    .select()
    .single()

  if (error) throw error

  cachedCities = null
  await fetchCities(true)
  notifyCitiesChanged({ action: 'create', city: data })
  return data
}

/**
 * Update an existing city
 */
export async function updateCity(id, updates) {
  const patch = { ...updates, updated_at: new Date().toISOString() }
  if (patch.popular_localities && !Array.isArray(patch.popular_localities)) {
    patch.popular_localities = String(patch.popular_localities)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  }

  const { data, error } = await supabase
    .from('cities')
    .update(patch)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error

  cachedCities = null
  await fetchCities(true)
  notifyCitiesChanged({ action: 'update', city: data })
  return data
}

/**
 * Delete a city
 */
export async function deleteCity(id) {
  const { error } = await supabase.from('cities').delete().eq('id', id)
  if (error) throw error

  cachedCities = null
  await fetchCities(true)
  notifyCitiesChanged({ action: 'delete', id })
  return true
}
