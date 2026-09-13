import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { expandBusyDates, shiftIso, todayIso } from '../lib/bookingDates'

export function useBusyDates(listingId, units = 1) {
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

    const load = async () => {
      setLoading(true)
      const rpc = await supabase.rpc('listing_busy_dates', {
        p_listing_id: listingId,
        p_from: from,
        p_to: to,
      })
      if (!cancelled && !rpc.error && Array.isArray(rpc.data)) {
        setBusy(new Set(rpc.data.map((row) => String(row.day).slice(0, 10))))
        setLoading(false)
        return
      }

      const view = await supabase
        .from('listing_busy_ranges')
        .select('start_date, end_date')
        .eq('listing_id', listingId)

      const fallback = view.error
        ? await supabase
          .from('bookings')
          .select('start_date, end_date, status')
          .eq('listing_id', listingId)
          .in('status', ['pending', 'confirmed', 'active'])
        : view

      if (!cancelled) {
        setBusy(expandBusyDates(fallback.data || [], units, from, to))
        setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [listingId, units])

  return { busy, loading }
}
