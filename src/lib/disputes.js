import { supabase } from './supabase'

export const DISPUTE_TYPES = [
  { value: 'damage',  label: '💥 Item Damaged',      desc: 'Item returned with damage' },
  { value: 'noshow',  label: '👻 No Show',            desc: 'Other party did not show up' },
  { value: 'fraud',   label: '🚨 Fraud / Scam',       desc: 'Suspected fraudulent activity' },
  { value: 'quality', label: '⚠️ Not as Described',   desc: 'Item differs from listing' },
  { value: 'other',   label: '📝 Other',              desc: 'Any other issue' },
]

export async function createDispute({ bookingId, raisedBy, type, description, evidenceUrls = [] }) {
  const { error } = await supabase.from('disputes').insert({
    id:            crypto.randomUUID(),
    booking_id:    bookingId,
    raised_by:     raisedBy,
    type,
    description:   description?.trim(),
    evidence_urls: evidenceUrls,
    status:        'open',
    created_at:    new Date().toISOString(),
  })
  if (error) throw error
  // Mark booking as disputed
  await supabase.from('bookings').update({ status: 'disputed' }).eq('id', bookingId)
}
