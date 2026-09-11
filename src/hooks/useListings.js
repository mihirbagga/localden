import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

/**
 * useListings — fetches listings from Supabase with optional filters.
 * Falls back to empty array if Supabase is not yet configured.
 *
 * @param {Object} filters
 * @param {string} filters.category  - 'gaming' | 'music' | 'all'
 * @param {string} filters.location  - area name or 'All Locations'
 * @param {string} filters.search    - text search
 * @param {number} filters.maxPrice  - max price per day
 * @param {string} filters.sortBy    - sort option
 */
export function useListings(filters = {}) {
  const [listings, setListings] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState(null)

  const { category = 'all', location, search, maxPrice, sortBy } = filters

  useEffect(() => {
    let cancelled = false

    const fetch = async () => {
      setLoading(true)
      setError(null)

      try {
        let query = supabase
          .from('listings')
          .select(`
            *,
            profiles (
              id,
              full_name,
              avatar_url,
              rating,
              kyc_status
            )
          `)
          .eq('is_available', true)
          .eq('is_published', true)

        if (category && category !== 'all') {
          query = query.eq('category', category)
        }
        if (location && location !== 'All Locations') {
          query = query.eq('location', location)
        }
        if (maxPrice) {
          query = query.lte('price_day', maxPrice)
        }
        if (search) {
          query = query.or(
            `title.ilike.%${search}%,subcategory.ilike.%${search}%,description.ilike.%${search}%`
          )
        }

        // Sorting
        switch (sortBy) {
          case 'Price: Low to High':
            query = query.order('price_day', { ascending: true }); break
          case 'Price: High to Low':
            query = query.order('price_day', { ascending: false }); break
          case 'Top Rated':
            query = query.order('rating', { ascending: false }); break
          default:
            query = query.order('created_at', { ascending: false })
        }

        const { data, error: qErr } = await query

        if (qErr) throw qErr
        if (!cancelled) setListings(data || [])
      } catch (err) {
        if (!cancelled) {
          console.warn('Supabase fetch failed (are your env vars set?):', err.message)
          setError(err.message)
          setListings([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetch()
    return () => { cancelled = true }
  }, [category, location, search, maxPrice, sortBy])

  return { listings, loading, error }
}

/**
 * useListingById — fetches a single listing by ID
 */
export function useListingById(id) {
  const [listing, setListing] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  useEffect(() => {
    if (!id) return
    let cancelled = false

    const fetch = async () => {
      setLoading(true)
      const { data, error: qErr } = await supabase
        .from('listings')
        .select(`*, profiles (*)`)
        .eq('id', id)
        .single()

      if (!cancelled) {
        if (qErr) setError(qErr.message)
        else setListing(data)
        setLoading(false)
      }
    }

    fetch()
    return () => { cancelled = true }
  }, [id])

  return { listing, loading, error }
}
