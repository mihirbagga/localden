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
    `Hi — this is regarding your ${title} rental on लोकल Den.`,
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

export function buildBookingAlertMessage(type, booking, extraData = {}) {
  const title = booking?.listings?.title || 'Gear'
  const start = booking?.start_date || ''
  const end = booking?.end_date || ''
  const days = booking?.total_days || 1
  const total = booking?.total_amount ? `₹${booking.total_amount}` : ''
  const deposit = booking?.deposit ? `₹${booking.deposit}` : ''

  switch (type) {
    case 'new_request':
      return {
        subject: `New Rental Request: ${title} on LocalDen`,
        text: `Hey! You have a new rental request for "${title}" from ${start} to ${end} (${days} days, total ${total}). Please log in to LocalDen to review and confirm.`,
      }
    case 'confirmed':
      return {
        subject: `Booking Confirmed: ${title} on LocalDen`,
        text: `Great news! Your booking for "${title}" (${start} → ${end}) has been confirmed! Get ready for pickup. Please remember to take check-in photos on handover.`,
      }
    case 'pickup_reminder':
      return {
        subject: `Pickup Reminder: ${title} starts tomorrow!`,
        text: `Reminder: Your rental for "${title}" begins tomorrow (${start}). Please ensure contact is verified and snap condition check-in photos in the app!`,
      }
    case 'return_reminder':
      return {
        subject: `Return Reminder: ${title} is due back today`,
        text: `Friendly reminder: "${title}" is scheduled to be returned today (${end}). Please meet up, take check-out photos, and return gear on time to get your deposit back!`,
      }
    case 'deposit_refund': {
      const refund = extraData.refundAmount != null ? `₹${extraData.refundAmount}` : deposit
      const deduction = Number(extraData.deductionAmount || 0)
      const reason = extraData.reason ? ` Reason: ${extraData.reason}` : ''
      const details = deduction > 0
        ? `Refund: ${refund} released (Deducted: ₹${deduction}.${reason})`
        : `Full security deposit of ${refund} has been refunded.`
      return {
        subject: `Deposit Settlement: ${title} on LocalDen`,
        text: `Your security deposit for "${title}" has been settled! ${details} Thanks for using LocalDen!`,
      }
    }
    default:
      return {
        subject: `Update on ${title} · LocalDen`,
        text: bookingThreadText(booking, extraData.extra || ''),
      }
  }
}

export function bookingWhatsAppLink(type, booking, targetPhone, extraData = {}) {
  const { text } = buildBookingAlertMessage(type, booking, extraData)
  return whatsappHref(targetPhone, text)
}

export function bookingMailtoLink(type, booking, targetEmail, extraData = {}) {
  const { subject, text } = buildBookingAlertMessage(type, booking, extraData)
  return mailtoHref(targetEmail, subject, text)
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
  agreement_signed: 'Agreement signed',
  deposit_settled: 'Deposit refunded',
  kyc_submitted: 'KYC submitted',
  kyc_verified: 'KYC verified',
  kyc_rejected: 'KYC rejected',
  referral_joined: 'Referral signed up',
  referral_paid: 'Referral reward',
  wallet_earning: 'Wallet earning',
}
