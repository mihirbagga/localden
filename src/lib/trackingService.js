import { supabase } from './supabase'
import { getHandoverPin, getReturnPin } from './messages'

/**
 * Valid Tracking Statuses:
 * - awaiting_confirmation: Just booked, awaiting host / admin acceptance
 * - confirmed: Confirmed by lister or admin, preparing at hub/host
 * - on_the_way: Admin or host marked order on the way with assigned courier driver
 * - delivered: Both Renter & Driver OTPs verified, order active
 * - completed: Returned to host/hub
 */

export const TRACKING_STATUS_CONFIG = {
  awaiting_confirmation: {
    key: 'awaiting_confirmation',
    stepIndex: 0,
    title: 'Awaiting Confirmation',
    badge: 'Awaiting Host / Admin',
    desc: 'Order placed! Waiting for Lister or LocalDen Admin to confirm.',
    badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    color: '#f59e0b',
  },
  confirmed: {
    key: 'confirmed',
    stepIndex: 1,
    title: 'Order Confirmed & Preparing',
    badge: 'Confirmed & Packing',
    desc: 'Order accepted! System hardware is reserved, tested & packed for handover.',
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
    badge: 'Active Session',
    desc: 'Handover PIN verified! Physical custody transferred. Happy gaming!',
    badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    color: '#10b981',
  },
  completed: {
    key: 'completed',
    stepIndex: 4,
    title: 'Returned & Verified',
    badge: 'Completed',
    desc: 'System returned to host/hub and return check-out verified.',
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

  // Unified PINs so BookingStepper, Dashboard, AdminBookings, LiveTrackingModal & VerifyDelivery all show the same 4-digit PIN
  const canonicalHandoverOtp = getHandoverPin(bookingId)
  const canonicalReturnOtp = getReturnPin(bookingId)
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
      eta_minutes: 30,
      eta_target_time: null,
      driver: null,
      renter_otp: canonicalHandoverOtp,
      return_otp: canonicalReturnOtp,
      driver_otp: fallbackDriverOtp,
      verified: bookingData?.status === 'active' || bookingData?.status === 'completed',
      verified_at: null,
      return_verified: bookingData?.status === 'completed',
      return_verified_at: null,
      handover_checklist: null,
      return_checklist: null,
      timeline: [
        {
          status: defaultStatus,
          label: TRACKING_STATUS_CONFIG[defaultStatus]?.title || 'Order Created',
          timestamp: bookingData?.created_at || new Date().toISOString(),
        },
      ],
      updated_at: new Date().toISOString(),
    }
  }

  return {
    booking_id: bookingId,
    tracking_status: record.tracking_status || defaultStatus,
    eta: record.eta || '25-35 mins',
    eta_minutes: record.eta_minutes || 30,
    eta_target_time: record.eta_target_time || null,
    driver: record.driver || null,
    renter_otp: canonicalHandoverOtp,
    legacy_renter_otp: record.renter_otp || generateDeterministicOtp(bookingId, 101),
    return_otp: record.return_otp || canonicalReturnOtp,
    driver_otp: record.driver_otp || fallbackDriverOtp,
    verified: Boolean(record.verified || bookingData?.status === 'active' || bookingData?.status === 'completed'),
    verified_at: record.verified_at || null,
    return_verified: Boolean(record.return_verified || bookingData?.status === 'completed'),
    return_verified_at: record.return_verified_at || null,
    handover_checklist: record.handover_checklist || null,
    return_checklist: record.return_checklist || null,
    timeline: Array.isArray(record.timeline) && record.timeline.length > 0
      ? record.timeline
      : [
          {
            status: record.tracking_status || defaultStatus,
            label: TRACKING_STATUS_CONFIG[record.tracking_status || defaultStatus]?.title || 'Status Updated',
            timestamp: record.updated_at || new Date().toISOString(),
          },
        ],
    updated_at: record.updated_at || new Date().toISOString(),
  }
}

export async function updateBookingTracking(bookingId, patch) {
  if (!bookingId) return null
  const all = await fetchAllTrackings()
  const current = all[bookingId] || await getBookingTracking(bookingId)
  const nowIso = new Date().toISOString()

  const timeline = Array.isArray(current.timeline) ? [...current.timeline] : []
  if (patch.tracking_status && patch.tracking_status !== current.tracking_status) {
    timeline.push({
      status: patch.tracking_status,
      label: TRACKING_STATUS_CONFIG[patch.tracking_status]?.title || patch.tracking_status,
      timestamp: nowIso,
      note: patch.note || null,
    })
  } else if (patch.driver && patch.driver?.id !== current.driver?.id) {
    timeline.push({
      status: current.tracking_status || 'confirmed',
      label: `Courier Assigned: ${patch.driver.name}`,
      timestamp: nowIso,
    })
  }

  // If moving to on_the_way and no eta_target_time is set yet, start a 30-min live countdown automatically
  const autoEtaPatch = {}
  if (patch.tracking_status === 'on_the_way' && !patch.eta_target_time && !current.eta_target_time) {
    const mins = Number(current.eta_minutes || 30)
    autoEtaPatch.eta_minutes = mins
    autoEtaPatch.eta = `${mins} mins`
    autoEtaPatch.eta_target_time = new Date(Date.now() + mins * 60000).toISOString()
  }

  const updatedRecord = {
    ...current,
    ...autoEtaPatch,
    ...patch,
    renter_otp: getHandoverPin(bookingId),
    return_otp: getReturnPin(bookingId),
    timeline: timeline.slice(-10),
    updated_at: nowIso,
  }

  all[bookingId] = updatedRecord

  await supabase.from('site_settings').upsert({
    id: 'delivery_trackings',
    value: all,
    updated_at: nowIso,
  })

  // Synchronize with bookings table status
  if (patch.tracking_status === 'confirmed') {
    await supabase.from('bookings').update({ status: 'confirmed', updated_at: nowIso }).eq('id', bookingId)
  } else if (patch.tracking_status === 'delivered') {
    await supabase.from('bookings').update({ status: 'active', updated_at: nowIso }).eq('id', bookingId)
  } else if (patch.tracking_status === 'completed') {
    await supabase.from('bookings').update({ status: 'completed', updated_at: nowIso }).eq('id', bookingId)
  }

  return updatedRecord
}

/**
 * Dual OTP Verification Handshake (Supports both Pickup Handover and Return Pickup)
 * User brings Renter OTP (Handover or Return PIN), Driver brings Driver OTP.
 */
export async function verifyDualOtp({ bookingId, inputRenterOtp, inputDriverOtp, phase = 'checkin', checklist = null }) {
  if (!bookingId) {
    return { success: false, message: 'Invalid booking reference.' }
  }

  const tracking = await getBookingTracking(bookingId)
  if (!tracking) {
    return { success: false, message: 'Order tracking record not found.' }
  }

  const cleanRenter = String(inputRenterOtp || '').trim()
  const cleanDriver = String(inputDriverOtp || '').trim()

  const isReturn = phase === 'checkout' || phase === 'return'
  const validCustomerPins = isReturn
    ? [tracking.return_otp, getReturnPin(bookingId)]
    : [tracking.renter_otp, tracking.legacy_renter_otp, getHandoverPin(bookingId)].filter(Boolean)

  if (!validCustomerPins.includes(cleanRenter)) {
    return {
      success: false,
      message: isReturn
        ? 'Return OTP does not match. Please verify the 4-digit Return PIN on the customer pass.'
        : 'Customer Handover OTP does not match. Please verify the 4-digit PIN displayed on customer device.',
    }
  }

  if (cleanDriver !== tracking.driver_otp) {
    return { success: false, message: 'Driver Security OTP does not match. Please verify your driver portal code.' }
  }

  const nowIso = new Date().toISOString()
  if (isReturn) {
    const updated = await updateBookingTracking(bookingId, {
      tracking_status: 'completed',
      return_verified: true,
      return_verified_at: nowIso,
      return_checklist: checklist,
      note: 'Dual OTP verified on return pickup',
    })
    return {
      success: true,
      message: '✓ Return Handshake Verified! Gear return is authenticated and rental is marked completed.',
      tracking: updated,
    }
  }

  // Pickup / Delivery Handshake verified!
  const updated = await updateBookingTracking(bookingId, {
    tracking_status: 'delivered',
    verified: true,
    verified_at: nowIso,
    handover_checklist: checklist,
    note: 'Dual OTP verified at doorstep handover',
  })

  return {
    success: true,
    message: '✓ Handshake Verified! Physical handover confirmed and rental is now active.',
    tracking: updated,
  }
}

/**
 * Single-PIN + Checklist Verification for Host/Lister or Admin direct handover/return
 */
export async function verifySinglePinHandover({
  bookingId,
  inputPin,
  phase = 'checkin',
  checklist = null,
  bypassPin = false,
}) {
  if (!bookingId) return { success: false, message: 'Missing booking ID.' }
  const isReturn = phase === 'checkout' || phase === 'return'
  const expectedPin = isReturn ? getReturnPin(bookingId) : getHandoverPin(bookingId)
  const cleanInput = String(inputPin || '').trim()

  if (!bypassPin && cleanInput !== expectedPin) {
    return {
      success: false,
      message: `Incorrect ${isReturn ? 'Return' : 'Handover'} PIN. Expected the 4-digit code shown on the renter's pass.`,
    }
  }

  const nowIso = new Date().toISOString()
  if (isReturn) {
    const updated = await updateBookingTracking(bookingId, {
      tracking_status: 'completed',
      return_verified: true,
      return_verified_at: nowIso,
      return_checklist: checklist,
      note: bypassPin ? 'Return verified in-person by Host' : 'Return PIN verified by Host',
    })
    return {
      success: true,
      message: '✓ Return verified & rental marked completed!',
      tracking: updated,
    }
  }

  const updated = await updateBookingTracking(bookingId, {
    tracking_status: 'delivered',
    verified: true,
    verified_at: nowIso,
    handover_checklist: checklist,
    note: bypassPin ? 'Handover verified in-person by Host' : 'Handover PIN verified by Host',
  })
  return {
    success: true,
    message: '✓ Handover PIN verified & rental is now active!',
    tracking: updated,
  }
}

/**
 * Calculate remaining ETA string from either a tracking object or (estimatedMinutes, createdAt).
 */
export function calculateRemainingEta(trackingOrMinutes = 30, createdAt = null) {
  if (trackingOrMinutes && typeof trackingOrMinutes === 'object') {
    const trk = trackingOrMinutes
    if (trk.tracking_status === 'delivered') return 'Delivered ✓'
    if (trk.tracking_status === 'completed') return 'Completed ✓'
    if (trk.eta_target_time) {
      const targetMs = new Date(trk.eta_target_time).getTime()
      if (!Number.isNaN(targetMs)) {
        const diffSec = Math.max(0, Math.floor((targetMs - Date.now()) / 1000))
        if (diffSec <= 45) return 'Arriving any moment'
        const mins = Math.floor(diffSec / 60)
        const secs = diffSec % 60
        return mins > 0 ? `${mins}m ${String(secs).padStart(2, '0')}s` : `${secs}s`
      }
    }
    return trk.eta || `${trk.eta_minutes || 30} mins`
  }

  const estimatedMinutes = Number(trackingOrMinutes) || 35
  if (!createdAt) return `${estimatedMinutes} mins`
  const createdMs = new Date(createdAt).getTime()
  if (Number.isNaN(createdMs)) return `${estimatedMinutes} mins`

  const elapsedMins = Math.floor((Date.now() - createdMs) / 60000)
  const remaining = Math.max(5, estimatedMinutes - elapsedMins)
  return `${remaining} mins`
}

