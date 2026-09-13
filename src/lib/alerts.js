function digitsPhone(phone) {
  const digits = String(phone || '').replace(/\D/g, '')
  if (!digits) return ''
  if (digits.length === 10) return `91${digits}`
  return digits
}

export function whatsappHref(phone, text) {
  const to = digitsPhone(phone)
  const q = encodeURIComponent(text || '')
  return to ? `https://wa.me/${to}?text=${q}` : `https://wa.me/?text=${q}`
}

export function mailtoHref(email, subject, body) {
  const addr = String(email || '').trim()
  const q = new URLSearchParams()
  if (subject) q.set('subject', subject)
  if (body) q.set('body', body)
  return `mailto:${addr}?${q.toString()}`
}

export function bookingThreadText(booking, extra = '') {
  const listing = booking?.listings
  const title = listing?.title || 'gear'
  const start = booking?.start_date || ''
  const end = booking?.end_date || ''
  return [
    `Hi — this is about the ${title} booking on लोकल Den.`,
    start && end ? `Dates: ${start} → ${end}.` : '',
    extra,
  ].filter(Boolean).join(' ')
}

export function otherPartyContact(booking, role) {
  const listing = booking?.listings || {}
  if (role === 'lister') {
    const person = booking?.renter || {}
    return {
      name: person.full_name || 'Renter',
      phone: person.phone || '',
      email: person.email || '',
    }
  }
  const person = booking?.lister || {}
  return {
    name: person.full_name || 'Lister',
    phone: person.phone || listing.contact_phone || '',
    email: person.email || '',
  }
}

export const ALERT_KIND_LABEL = {
  booking_new: 'New booking',
  booking_placed: 'Booking placed',
  status_confirmed: 'Confirmed',
  status_active: 'Handed over',
  status_completed: 'Returned',
  status_cancelled: 'Cancelled',
  reminder_start: 'Pickup tomorrow',
  reminder_return: 'Return due',
  reminder_overdue: 'Return overdue',
  inspection_checkin: 'Check-in photos',
  inspection_checkout: 'Check-out photos',
}
