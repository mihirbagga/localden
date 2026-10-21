import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { expandBusyDates, shiftIso, todayIso } from '../lib/bookingDates'

export function useBusyDates(listingId, units = 1, isAvailable = true) {
  const [busy, setBusy] = useState(() => new Set())
  const [loading, setLoading] = useState(Boolean(listingId))

  useEffect(() => {
    if (!listingId) {
      setBusy(new Set())
      setLoading(false)
      return undefined
    }

    let cancelled = false
    const from = todayIso()
    const to = shiftIso(from, 120)

    // Helper to generate full busy window if listing is paused/Unavailable
    const markAllBusy = () => {
      const allDays = new Set()
      let c = from
      while (c <= to) {
        allDays.add(c)
        c = shiftIso(c, 1)
      }
      return allDays
    }

    if (isAvailable === false) {
      setBusy(markAllBusy())
      setLoading(false)
      return undefined
    }

    const load = async () => {
      setLoading(true)

      // 1. Try listing_busy_dates RPC
      try {
        const rpc = await supabase.rpc('listing_busy_dates', {
          p_listing_id: listingId,
          p_from: from,
          p_to: to,
        })
        if (!cancelled && !rpc.error && Array.isArray(rpc.data) && rpc.data.length > 0) {
          setBusy(new Set(rpc.data.map((row) => String(row.day).slice(0, 10))))
          setLoading(false)
          return
        }
      } catch (e) {
        // continue to fallbacks
      }

      // 2. Try get_listing_booked_ranges RPC (security definer)
      try {
        const rpc2 = await supabase.rpc('get_listing_booked_ranges', {
          p_listing_id: listingId,
        })
        if (!cancelled && !rpc2.error && Array.isArray(rpc2.data) && rpc2.data.length > 0) {
          setBusy(expandBusyDates(rpc2.data, units, from, to))
          setLoading(false)
          return
        }
      } catch (e) {
        // continue
      }

      // 3. Try listing_busy_ranges view
      try {
        const view = await supabase
          .from('listing_busy_ranges')
          .select('start_date, end_date')
          .eq('listing_id', listingId)

        if (!cancelled && !view.error && Array.isArray(view.data) && view.data.length > 0) {
          setBusy(expandBusyDates(view.data, units, from, to))
          setLoading(false)
          return
        }
      } catch (e) {
        // continue
      }

      // 4. Try bookings table directly
      try {
        const fb = await supabase
          .from('bookings')
          .select('start_date, end_date, status')
          .eq('listing_id', listingId)
          .in('status', ['pending', 'confirmed', 'active'])

        if (!cancelled && !fb.error && Array.isArray(fb.data) && fb.data.length > 0) {
          setBusy(expandBusyDates(fb.data, units, from, to))
          setLoading(false)
          return
        }
      } catch (e) {
        // continue
      }

      // 5. Final check: if listing is manually paused (is_available === false)
      try {
        const { data: lst } = await supabase
          .from('listings')
          .select('is_available')
          .eq('id', listingId)
          .maybeSingle()

        if (!cancelled && lst && lst.is_available === false) {
          setBusy(markAllBusy())
          setLoading(false)
          return
        }
      } catch (e) {
        // ignore
      }

      if (!cancelled) {
        setBusy(new Set())
        setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [listingId, units, isAvailable])

  return { busy, loading }
}
