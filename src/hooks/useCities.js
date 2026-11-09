import { useState, useEffect, useCallback, useMemo } from 'react'
import { fetchCities, subscribeCities } from '../lib/citiesService'
import { CITIES as FALLBACK_CITIES, setGlobalCities } from '../lib/cities'

const STORAGE_KEY = 'ld_cities_cache_v1'

function getInitialCities() {
  if (typeof window === 'undefined') return FALLBACK_CITIES
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) {
        setGlobalCities(parsed)
        return parsed
      }
    }
  } catch {}
  return FALLBACK_CITIES
}

export function useCities() {
  const [cities, setCities] = useState(getInitialCities)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const load = useCallback(async (force = false) => {
    try {
      setLoading(true)
      const data = await fetchCities(force)
      if (Array.isArray(data) && data.length > 0) {
        setCities(data)
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
        } catch {}
      }
      setError(null)
    } catch (err) {
      setError(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    const unsubscribe = subscribeCities(() => {
      load(true)
    })
    return unsubscribe
  }, [load])

  const activeCities = useMemo(() => {
    const list = cities.filter((c) => c.is_active !== false && c.isActive !== false)
    return list.length > 0 ? list : cities
  }, [cities])

  return {
    cities,
    activeCities,
    loading,
    error,
    refresh: () => load(true),
  }
}

