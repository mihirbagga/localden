import { supabase } from './supabase'

export const BOOKING_STATUSES = {
  pending:   { label: 'Pending',   color: '#ffd23f', bg: 'rgba(255,210,63,0.1)',  border: 'rgba(255,210,63,0.3)'  },
  confirmed: { label: 'Confirmed', color: '#00e5ff', bg: 'rgba(0,229,255,0.1)',   border: 'rgba(0,229,255,0.3)'   },
  active:    { label: 'Active',    color: '#00ff94', bg: 'rgba(0,255,148,0.1)',   border: 'rgba(0,255,148,0.3)'   },
  completed: { label: 'Completed', color: '#a855f7', bg: 'rgba(168,85,247,0.1)',  border: 'rgba(168,85,247,0.3)'  },
  cancelled: { label: 'Cancelled', color: '#ff6b9d', bg: 'rgba(255,107,157,0.1)', border: 'rgba(255,107,157,0.3)' },
  disputed:  { label: 'Disputed',  color: '#ff8c00', bg: 'rgba(255,140,0,0.1)',   border: 'rgba(255,140,0,0.3)'   },
}

async function updateStatus(bookingId, status) {
  const { error } = await supabase
    .from('bookings')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', bookingId)
  if (error) throw error
}

export const acceptBooking = (id) => updateStatus(id, 'confirmed')
export const rejectBooking = (id) => updateStatus(id, 'cancelled')
export const markActive    = (id) => updateStatus(id, 'active')
export const markCompleted = (id) => updateStatus(id, 'completed')
export const cancelBooking = (id) => updateStatus(id, 'cancelled')

export function StatusBadge({ status }) {
  const s = BOOKING_STATUSES[status] || BOOKING_STATUSES.pending
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-display font-bold"
      style={{ background: s.bg, border: `1px solid ${s.border}`, color: s.color }}>
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: s.color }} />
      {s.label}
    </span>
  )
}
