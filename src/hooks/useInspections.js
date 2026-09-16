import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useInspections(bookingId) {
  const [inspections, setInspections] = useState([])
  const [loading, setLoading]         = useState(true)

  const fetchInspections = async () => {
    if (!bookingId) return
    setLoading(true)
    const { data } = await supabase
      .from('booking_inspections')
      .select('*, profiles!booking_inspections_submitted_by_fkey(full_name)')
      .eq('booking_id', bookingId)
      .order('created_at', { ascending: true })

    setInspections(data || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchInspections()
  }, [bookingId])

  return { inspections, loading, refreshInspections: fetchInspections }
}

export async function submitInspection({ bookingId, listingId, submittedBy, role, phase, condition, notes, photos = [] }) {
  const { error } = await supabase.from('booking_inspections').insert({
    id: crypto.randomUUID(),
    booking_id: bookingId,
    listing_id: listingId,
    submitted_by: submittedBy,
    role,
    phase,
    condition,
    notes: notes?.trim() || null,
    photos,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  })
  if (error) throw error
}
