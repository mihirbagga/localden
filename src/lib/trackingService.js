import { supabase } from './supabase'

/**
 * Valid Tracking Statuses:
 * - awaiting_confirmation: Just booked, awaiting host / admin acceptance
 * - confirmed: Confirmed by lister or admin, preparing at hub/host
 * - on_the_way: Admin marked order on the way with assigned courier driver
 * - delivered: Both Renter & Driver OTPs verified, order active
 * - completed: Returned to host/hub
 */

export const TRACKING_STATUS_CONFIG = {
  awaiting_confirmation: {
    key: 'awaiting_confirmation',
    stepIndex: 0,
    title: 'Awaiting Confirmation',
    badge: 'Awaiting Host / Admin',
    desc: 'Order placed! Waiting for Lister or localDen Admin to confirm.',
    badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    color: '#f59e0b',
  },
  confirmed: {
    key: 'confirmed',
    stepIndex: 1,
    title: 'Order Confirmed & Preparing',
    badge: 'Confirmed',
    desc: 'Order accepted! System hardware is reserved & inspected for dispatch.',
    badgeClass: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
    color: '#3b82f6',
  },
  on_the_way: {
    key: 'on_the_way',
    stepIndex: 2,
    title: 'Order On The Way',
    badge: 'Out For Delivery',
    desc: 'Courier delivery partner is actively en route with your system.',
    badgeClass: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 animate-pulse',
    color: '#06b6d4',
  },
  delivered: {
    key: 'delivered',
    stepIndex: 3,
    title: 'Delivered & Handover Complete',
    badge: 'Delivered',
    desc: 'Dual OTP verified! Physical handover complete. Happy gaming!',
    badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    color: '#10b981',
  },
  completed: {
    key: 'completed',
    stepIndex: 4,
    title: 'Rental Completed',
    badge: 'Completed',
    desc: 'System returned to host/hub in good condition.',
    badgeClass: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    color: '#a855f7',
  },
}

export function generateDeterministicOtp(seedString, offset = 0) {
  let hash = 0
  const combined = String(seedString || 'LD123') + String(offset)
  for (let i = 0; i < combined.length; i++) {
    hash = (hash << 5) - hash + combined.charCodeAt(i)
    hash |= 0
  }
  const positive = Math.abs(hash)
  return String(1000 + (positive % 9000))
}

export async function fetchAllTrackings() {
  try {
    const { data } = await supabase
      .from('site_settings')
      .select('value')
      .eq('id', 'delivery_trackings')
      .maybeSingle()

    return data?.value && typeof data.value === 'object' ? data.value : {}
  } catch (err) {
    console.warn('fetchAllTrackings error:', err?.message)
    return {}
  }
}

export async function getBookingTracking(bookingId, bookingData = null) {
  if (!bookingId) return null
  const all = await fetchAllTrackings()
  const record = all[bookingId]

  const fallbackRenterOtp = generateDeterministicOtp(bookingId, 101)
  const fallbackDriverOtp = generateDeterministicOtp(bookingId, 909)

  let defaultStatus = 'awaiting_confirmation'
  if (bookingData?.status === 'confirmed') defaultStatus = 'confirmed'
  else if (bookingData?.status === 'active') defaultStatus = 'delivered'
  else if (bookingData?.status === 'completed') defaultStatus = 'completed'

  if (!record) {
    return {
      booking_id: bookingId,
      tracking_status: defaultStatus,
      eta: '25-35 mins',
      driver: null,
      renter_otp: fallbackRenterOtp,
      driver_otp: fallbackDriverOtp,
      verified: bookingData?.status === 'active' || bookingData?.status === 'completed',
      verified_at: null,
      updated_at: new Date().toISOString(),
    }
  }

  return {
    booking_id: bookingId,
    tracking_status: record.tracking_status || defaultStatus,
    eta: record.eta || '25-35 mins',
    driver: record.driver || null,
    renter_otp: record.renter_otp || fallbackRenterOtp,
    driver_otp: record.driver_otp || fallbackDriverOtp,
    verified: Boolean(record.verified),
    verified_at: record.verified_at || null,
    updated_at: record.updated_at || new Date().toISOString(),
  }
}

export async function updateBookingTracking(bookingId, patch) {
  if (!bookingId) return null
  const all = await fetchAllTrackings()
  const current = all[bookingId] || await getBookingTracking(bookingId)

  const updatedRecord = {
    ...current,
    ...patch,
    updated_at: new Date().toISOString(),
  }

  all[bookingId] = updatedRecord

  await supabase.from('site_settings').upsert({
    id: 'delivery_trackings',
    value: all,
    updated_at: new Date().toISOString(),
  })

  // Synchronize with bookings table status
  if (patch.tracking_status === 'confirmed') {
    await supabase.from('bookings').update({ status: 'confirmed', updated_at: new Date().toISOString() }).eq('id', bookingId)
  } else if (patch.tracking_status === 'delivered') {
    await supabase.from('bookings').update({ status: 'active', updated_at: new Date().toISOString() }).eq('id', bookingId)
  }

  return updatedRecord
}

/**
 * Dual OTP Verification Handshake
 * User brings Renter OTP, Driver brings Driver OTP.
 */
export async function verifyDualOtp({ bookingId, inputRenterOtp, inputDriverOtp }) {
  if (!bookingId) {
    return { success: false, message: 'Invalid booking reference.' }
  }

  const tracking = await getBookingTracking(bookingId)
  if (!tracking) {
    return { success: false, message: 'Order tracking record not found.' }
  }

  const cleanRenter = String(inputRenterOtp || '').trim()
  const cleanDriver = String(inputDriverOtp || '').trim()

  if (cleanRenter !== tracking.renter_otp) {
    return { success: false, message: 'Renter OTP does not match. Please verify the code displayed on customer device.' }
  }

  if (cleanDriver !== tracking.driver_otp) {
    return { success: false, message: 'Driver Security OTP does not match. Please verify your driver portal code.' }
  }

  // Handshake verified!
  const updated = await updateBookingTracking(bookingId, {
    tracking_status: 'delivered',
    verified: true,
    verified_at: new Date().toISOString(),
  })

  return {
    success: true,
    message: '✓ Handshake Verified! Physical handover confirmed and rental is now active.',
    tracking: updated,
  }
}
