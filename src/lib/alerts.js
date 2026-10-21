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
  const shortRef = booking?.id ? `#${String(booking.id).slice(0, 8).toUpperCase()}` : ''
  const handoverPin = extraData.handoverPin || ''
  const returnPin = extraData.returnPin || ''

  switch (type) {
    case 'new_request':
      return {
        subject: `New Rental Request: ${title} on LocalDen`,
        text: `Hey! You have a new rental request for *${title}* (${shortRef}) from ${start} to ${end} (${days} days, total ${total}). Please open your LocalDen Host Dashboard to review and confirm! ⚡`,
      }
    case 'confirmed':
      return {
        subject: `Booking Confirmed: ${title} on LocalDen`,
        text: `🎉 Great news! Your booking for *${title}* (${shortRef} · ${start} → ${end}) is *CONFIRMED*!${handoverPin ? `\n\n🔐 *4-Digit Handover PIN:* *${handoverPin}*` : ''}\n\nPlease e-sign the Digital Rental Pact in your Dashboard and snap quick check-in photos on handover.`,
      }
    case 'pickup_reminder':
      return {
        subject: `Pickup / Delivery Reminder: ${title}`,
        text: `📦 Friendly reminder for your *${title}* rental (${shortRef} · ${start} → ${end}).${handoverPin ? `\n🔐 *Handover OTP PIN:* *${handoverPin}*` : ''}\n\nPlease ensure the Digital Rental Pact is e-signed and take check-in condition photos in the app at handover! ⚡`,
      }
    case 'return_reminder':
      return {
        subject: `Return Reminder: ${title} is due back on ${end}`,
        text: `📅 Friendly reminder: *${title}* (${shortRef}) is scheduled for return on *${end}*.${returnPin ? `\n🔐 *Return OTP PIN:* *${returnPin}*` : ''}\n\nPlease snap check-out condition photos and match the 4-digit Return PIN on handover to unlock instant deposit settlement!`,
      }
    case 'agreement_reminder':
      return {
        subject: `Signature Requested: Rental Pact for ${title}`,
        text: `✍️ Hi! Please e-sign the LocalDen Friendly Rental Pact for *${title}* (${shortRef} · ${start} → ${end}) in your Dashboard before handover.${handoverPin ? ` (Handover PIN: *${handoverPin}*)` : ''} Takes 10 seconds!`,
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
        text: `💰 Your security deposit for *${title}* (${shortRef}) has been settled! ${details} Thanks for renting on LocalDen!`,
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
