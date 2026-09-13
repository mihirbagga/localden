import { supabase } from './supabase'

export const INSPECTION_CONDITIONS = [
  { id: 'like_new', label: 'Like new' },
  { id: 'good', label: 'Good' },
  { id: 'fair', label: 'Fair wear' },
  { id: 'damaged', label: 'Damaged' },
]

export function conditionLabel(value) {
  return INSPECTION_CONDITIONS.find((item) => item.id === value)?.label || value || '—'
}

export async function fetchInspections(bookingId) {
  const { data, error } = await supabase
    .from('booking_inspections')
    .select('*, submitter:profiles!submitted_by(full_name, avatar_url)')
    .eq('booking_id', bookingId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data || []
}

export async function uploadInspectionPhotos({ userId, bookingId, phase, files }) {
  const urls = []
  for (const file of files) {
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
    const path = `inspections/${userId}/${bookingId}/${phase}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
    const { error } = await supabase.storage
      .from('listing-photos')
      .upload(path, file, { upsert: true, contentType: file.type || 'image/jpeg' })
    if (error) throw error
    const { data } = supabase.storage.from('listing-photos').getPublicUrl(path)
    if (data?.publicUrl) urls.push(data.publicUrl)
  }
  return urls
}

export async function saveInspection({
  bookingId,
  listingId,
  userId,
  role,
  phase,
  notes,
  condition,
  photos,
}) {
  const row = {
    booking_id: bookingId,
    listing_id: listingId,
    submitted_by: userId,
    role,
    phase,
    notes: notes?.trim() || null,
    condition,
    photos,
  }
  const { data, error } = await supabase
    .from('booking_inspections')
    .upsert(row, { onConflict: 'booking_id,submitted_by,phase' })
    .select()
    .single()
  if (error) throw error
  return data
}

export function phaseInspections(rows, phase) {
  return (rows || []).filter((row) => row.phase === phase)
}
