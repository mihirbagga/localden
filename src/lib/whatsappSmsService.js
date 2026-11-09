import { useState, useEffect, useCallback } from 'react'
import { supabase } from './supabase'
import { SUPPORT_PHONE_TEL } from './contact'

export const SETTING_KEY = 'whatsapp_notifications'

export const DEFAULT_WHATSAPP_SETTINGS = {
  enabled: true,
  admin_phone: '919034695091',
  notify_on_new_order: true,
  notify_on_payment_verified: true,
  notify_on_kyc_submit: false,
  notify_on_user_signup: true,
  notify_on_listing_live: true,
  webhook_url: '',
  auto_open_tab: false, // optionally open wa.me link directly on checkout
  template_header: '🚀 *NEW ORDER RECEIVED on LocalDen!*',
}

/**
 * Normalizes phone numbers to standard international format (digits only, no + or spaces)
 * Defaults 10-digit numbers to Indian country code +91
 */
export function cleanPhoneNumber(rawPhone) {
  if (!rawPhone) return ''
  const digits = String(rawPhone).replace(/\D/g, '')
  if (digits.length === 10) {
    return `91${digits}`
  }
  return digits
}

/**
 * Builds a direct wa.me link for instant WhatsApp messaging
 */
export function buildWhatsAppLink(phone, message) {
  const clean = cleanPhoneNumber(phone)
  const encoded = encodeURIComponent(message)
  return clean ? `https://wa.me/${clean}?text=${encoded}` : `https://wa.me/?text=${encoded}`
}

/**
 * Formats a clean, professional WhatsApp alert message for Admin when a new booking arrives
 */
export function formatNewOrderAdminMessage({
  bookingId,
  listing,
  renter,
  startDate,
  endDate,
  days,
  subtotal,
  deliveryFee = 0,
  deliveryDistanceKm = 0,
  warehouseNote = '',
  deposit = 0,
  protectionAmount = 0,
  discountAmount = 0,
  walletAmount = 0,
  paidAmount = 0,
  total,
  paymentStatus,
  paymentMethod,
  paymentRef,
  deliveryType,
  deliveryAddress,
  couponCode,
}) {
  const shortId = bookingId ? String(bookingId).slice(0, 8).toUpperCase() : 'PENDING'
  const gearTitle = listing?.title || 'Gear'
  const gearEmoji = listing?.emoji || '🎮'
  const category = listing?.category ? ` [${listing.category.toUpperCase()}]` : ''
  const renterName = renter?.full_name || renter?.user_metadata?.full_name || 'Customer'
  const renterPhone = renter?.phone || renter?.user_metadata?.phone || 'Not provided'
  const renterEmail = renter?.email || 'N/A'
  const fulfillment = deliveryType === 'delivery' ? '🚚 Doorstep Delivery' : '🏠 Self Pickup'
  const addressText = deliveryAddress
    ? `\n📍 *Delivery Address:* ${typeof deliveryAddress === 'object' ? JSON.stringify(deliveryAddress) : deliveryAddress}${deliveryDistanceKm ? ` (~${deliveryDistanceKm} km from hub)` : ''}`
    : ''
  const dispatchNote = warehouseNote ? `\n🏷️ *Warehouse Dispatch Note:* ${warehouseNote}` : ''
  const payStatus = paymentStatus === 'paid' ? '✅ PAID' : (paymentStatus === 'submitted' ? '⏳ UTR/PAYCODE SUBMITTED' : '⚠️ PENDING VERIFICATION')
  const refText = paymentRef ? `\n🔍 *PayCode / UTR:* ${paymentRef}` : ''
  const couponText = couponCode ? `\n🎟️ *Coupon Applied:* ${couponCode} (-₹${discountAmount})` : ''
  const adminUrl = typeof window !== 'undefined' ? `${window.location.origin}/admin` : 'https://localden.online/admin'
  const time = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })

  // Financial breakup section
  const lines = []
  if (subtotal) lines.push(`   • Base Rental: ₹${subtotal}`)
  if (deliveryFee) lines.push(`   • Delivery Fee: ₹${deliveryFee}`)
  if (protectionAmount) lines.push(`   • Damage Protection: ₹${protectionAmount}`)
  if (deposit) lines.push(`   • Security Deposit: ₹${deposit} (Escrow)`)
  if (discountAmount) lines.push(`   • Discount: -₹${discountAmount}`)
  if (walletAmount) lines.push(`   • Wallet Applied: -₹${walletAmount}`)
  const remainingPaid = paidAmount || (total - (walletAmount || 0))
  lines.push(`   • Balance Paid via ${paymentMethod || 'UPI'}: ₹${remainingPaid}`)

  return `━━━━━━━━━━━━━━━━━━━━━
🚀 *NEW ORDER #${shortId} RECEIVED*
━━━━━━━━━━━━━━━━━━━━━
📦 *Gear:* ${gearEmoji} *${gearTitle}*${category}
👤 *Renter:* ${renterName} (KYC: ${renter?.kyc_status === 'verified' ? '✓ Verified' : 'Pending'})
📞 *Phone:* ${renterPhone}
📧 *Email:* ${renterEmail}

📅 *Rental Window:* ${startDate} → ${endDate} (${days} day${days === 1 ? '' : 's'})
${fulfillment}${addressText}${dispatchNote}

💰 *PAYMENT BREAKUP:*
${lines.join('\n')}
💵 *Total Amount:* ₹${total} (${payStatus})
💳 *Method:* ${paymentMethod || 'Direct UPI / QR'}${refText}${couponText}
━━━━━━━━━━━━━━━━━━━━━
⏰ *Received:* ${time}
👉 *Approve in Admin:* ${adminUrl}`
}

/**
 * Formats a professional confirmation message for the Renter with complete breakdown and Handover OTP
 */
export function formatCustomerConfirmationMessage({
  bookingId,
  listing,
  renterName,
  startDate,
  endDate,
  days,
  subtotal,
  deliveryFee = 0,
  deliveryDistanceKm = 0,
  warehouseNote = '',
  deposit = 0,
  protectionAmount = 0,
  discountAmount = 0,
  walletAmount = 0,
  paidAmount = 0,
  total,
  deliveryType,
  deliveryAddress,
  handoverPin,
}) {
  const shortId = bookingId ? String(bookingId).slice(0, 8).toUpperCase() : 'BOOKED'
  const gearTitle = listing?.title || 'Gear'
  const gearEmoji = listing?.emoji || '🎮'
  const name = renterName || 'Friend'
  const fulfillment = deliveryType === 'delivery' ? 'Doorstep Delivery' : 'Self Pickup'

  const lines = []
  if (subtotal) lines.push(`• Rental (${days}d): ₹${subtotal}`)
  if (deliveryFee) lines.push(`• Delivery Charge: ₹${deliveryFee}${deliveryDistanceKm ? ` (~${deliveryDistanceKm} km)` : ''}`)
  if (protectionAmount) lines.push(`• Damage Protection: ₹${protectionAmount}`)
  if (deposit) lines.push(`• Refundable Deposit: ₹${deposit}`)
  if (discountAmount) lines.push(`• Promo Savings: -₹${discountAmount}`)
  if (walletAmount) lines.push(`• Wallet Balance Deducted: -₹${walletAmount}`)
  const balancePaid = paidAmount || (total - (walletAmount || 0))
  if (walletAmount > 0 && balancePaid > 0) {
    lines.push(`• Balance Paid via UPI/Cash: ₹${balancePaid}`)
  }

  const dispatchText = warehouseNote ? `\n🏷️ *Warehouse Dispatch:* ${warehouseNote}\n` : ''

  return `━━━━━━━━━━━━━━━━━━━━━
🎉 *BOOKING CONFIRMED — LOCAL DEN*
━━━━━━━━━━━━━━━━━━━━━
Hi *${name}*! Your rental for *${gearTitle}* ${gearEmoji} has been booked!

📅 *Rental Period:* ${startDate} → ${endDate} (${days} day${days === 1 ? '' : 's'})
🚚 *Fulfillment:* ${fulfillment}
${deliveryAddress ? `📍 *Address:* ${deliveryAddress}\n` : ''}${dispatchText}
💰 *PAYMENT BREAKUP:*
${lines.join('\n')}
💵 *Net Total:* ₹${total}

🔐 *YOUR 4-DIGIT HANDOVER OTP:* *${handoverPin || 'Provided on Pass'}*
_(Share this OTP with the host or courier rider when receiving your gear to begin your rental)._
━━━━━━━━━━━━━━━━━━━━━
Have questions or need cables/accessories? Reply right here on WhatsApp!
— Team LocalDen ⚡`
}

/**
 * Formats a message sent to the Lister/Host when new booking is reserved
 */
export function formatListerNewOrderMessage({
  bookingId,
  listing,
  renterName,
  renterKyc,
  startDate,
  endDate,
  days,
  subtotal,
  deliveryFee = 0,
  deposit = 0,
  walletAmount = 0,
  paidAmount = 0,
  warehouseNote = '',
  platformFee = 0,
  netEarnings,
  deliveryType,
}) {
  const shortId = bookingId ? String(bookingId).slice(0, 8).toUpperCase() : 'NEW'
  const gearTitle = listing?.title || 'Your Gear'
  const gearEmoji = listing?.emoji || '🎮'
  const hostEarn = netEarnings !== undefined ? netEarnings : Math.max(0, (subtotal || 0) - (platformFee || 0))

  const lines = []
  if (subtotal) lines.push(`   • Rental Rate (${days}d): ₹${subtotal}`)
  if (deliveryFee) lines.push(`   • Delivery Fee: ₹${deliveryFee}`)
  if (deposit) lines.push(`   • Security Deposit: ₹${deposit} (Held in Escrow)`)
  if (walletAmount) lines.push(`   • Wallet Applied: -₹${walletAmount}`)
  if (paidAmount) lines.push(`   • Renter Paid: ₹${paidAmount}`)

  const dispatchText = warehouseNote ? `\n🏷️ *Warehouse Dispatch:* ${warehouseNote}\n` : ''

  return `━━━━━━━━━━━━━━━━━━━━━
⚡ *NEW RENTAL RESERVATION!*
━━━━━━━━━━━━━━━━━━━━━
Great news! Someone just reserved *${gearTitle}* ${gearEmoji}.

👤 *Renter:* ${renterName || 'Verified Member'} (${renterKyc === 'verified' ? '✓ ID Verified' : 'ID Pending'})
📅 *Rental Dates:* ${startDate} → ${endDate} (${days} day${days === 1 ? '' : 's'})
🚚 *Handover Mode:* ${deliveryType === 'delivery' ? 'Courier Doorstep Delivery' : 'Self Pickup at your location'}${dispatchText}

💰 *PAYMENT BREAKUP:*
${lines.join('\n')}

💵 *YOUR NET EARNINGS:* *₹${hostEarn}*
🆔 *Booking Ref:* #${shortId}
━━━━━━━━━━━━━━━━━━━━━
👉 Open your Host Dashboard to confirm: https://localden.online/dashboard?tab=incoming`
}

/**
 * Formats a dispatch sheet WhatsApp message for the Courier Driver / Delivery Partner
 */
export function formatDriverDispatchMessage({
  booking,
  tracking,
  parsedAddress = null,
}) {
  const shortId = booking?.id ? String(booking.id).slice(0, 8).toUpperCase() : 'ORDER'
  const gearTitle = booking?.listings?.title || 'Gaming Hardware'
  const renterName = booking?.renter?.full_name || booking?.profiles?.full_name || 'Customer'
  const renterPhone = booking?.renter?.phone || booking?.profiles?.phone || 'On file'
  const cleanAddr = parsedAddress?.cleanAddress || booking?.delivery_address || 'Pickup / Delivery Address'
  const slotLine = parsedAddress?.slot ? `\n🕐 *Delivery Slot:* ${parsedAddress.slot}` : ''
  const noteLine = parsedAddress?.instructions ? `\n📝 *Rider Note:* ${parsedAddress.instructions}` : ''
  const mapsUrl = parsedAddress?.mapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(cleanAddr)}`
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://localden.online'
  const verifyUrl = `${origin}/verify-delivery?id=${booking?.id || ''}`

  return `━━━━━━━━━━━━━━━━━━━━━
🛵 *LOCALDEN DISPATCH SHEET #${shortId}*
━━━━━━━━━━━━━━━━━━━━━
📦 *Gear:* *${gearTitle}*
👤 *Customer:* ${renterName} (${renterPhone})
📍 *Destination:* ${cleanAddr}${slotLine}${noteLine}
🗺️ *Google Maps:* ${mapsUrl}

🔑 *YOUR DRIVER SECURITY OTP:* *${tracking?.driver_otp || '----'}*
_(Ask customer for their 4-digit Handover OTP upon arrival and verify both at the portal below)_

👉 *Verify Handover Portal:* ${verifyUrl}`
}

/**
 * Formats a live "Out for Delivery" WhatsApp alert for the Renter
 */
export function formatRenterOutForDeliveryMessage({
  booking,
  tracking,
  handoverPin,
}) {
  const shortId = booking?.id ? String(booking.id).slice(0, 8).toUpperCase() : 'ORDER'
  const gearTitle = booking?.listings?.title || 'Gear'
  const renterName = booking?.renter?.full_name || 'there'
  const driverName = tracking?.driver?.name || 'LocalDen Express Rider'
  const driverPhone = tracking?.driver?.phone || 'Assigned'
  const vehicle = tracking?.driver?.vehicle_number
    ? `${tracking.driver.vehicle_type || 'Scooter'} (${tracking.driver.vehicle_number})`
    : (tracking?.driver?.vehicle_type || 'Express Courier')
  const eta = tracking?.eta || '25-35 mins'
  const pin = handoverPin || tracking?.renter_otp || '----'
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://localden.online'

  return `━━━━━━━━━━━━━━━━━━━━━
🛵 *YOUR GEAR IS ON THE WAY!*
━━━━━━━━━━━━━━━━━━━━━
Hi *${renterName}*! Your *${gearTitle}* (#${shortId}) has been dispatched!

👨‍✈️ *Delivery Partner:* ${driverName} (${driverPhone})
🏍️ *Vehicle:* ${vehicle}
⏱️ *Live ETA:* *${eta}*

🔐 *YOUR 4-DIGIT HANDOVER PIN:* *${pin}*
_(Share this PIN only after inspecting your gear at the doorstep)_

👉 *Live Radar & Digital Pact:* ${origin}/dashboard?tab=bookings`
}

/**
 * Formats a "Handover Verified / Session Active" WhatsApp receipt for Renter or Host
 */
export function formatHandoverActiveMessage({
  booking,
  handoverPin,
  returnPin,
  recipientRole = 'renter',
}) {
  const shortId = booking?.id ? String(booking.id).slice(0, 8).toUpperCase() : 'ACTIVE'
  const gearTitle = booking?.listings?.title || 'Gear'
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://localden.online'

  if (recipientRole === 'lister') {
    return `✅ *HANDOVER COMPLETE (#${shortId})*\n\nYour *${gearTitle}* is now officially checked in and active with the renter until *${booking?.end_date}*.\n\n🔐 *Return OTP for Check-out:* *${returnPin}*\n👉 Manage on Dashboard: ${origin}/dashboard?tab=incoming`
  }

  return `━━━━━━━━━━━━━━━━━━━━━
🟢 *HANDOVER VERIFIED — SESSION LIVE!*
━━━━━━━━━━━━━━━━━━━━━
Physical handover for *${gearTitle}* (#${shortId}) is complete! Enjoy your session 🎮

📅 *Return Date:* *${booking?.end_date}*
🔐 *YOUR 4-DIGIT RETURN PIN:* *${returnPin}*
_(Keep this Return PIN handy — you'll match it with the host/rider on return to unlock instant deposit release)._

Want to extend by +1 day? Tap "+1 Day Extend" anytime in your Dashboard:
👉 ${origin}/dashboard?tab=bookings`
}

/**
 * Formats a "Rental Agreement E-Signature Request" WhatsApp message
 */
export function formatAgreementSignReminderMessage({
  booking,
  recipientName,
  senderName,
  handoverPin,
}) {
  const shortId = booking?.id ? String(booking.id).slice(0, 8).toUpperCase() : 'PACT'
  const gearTitle = booking?.listings?.title || 'Gear'
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://localden.online'

  return `✍️ *Digital Rental Pact Signature Request (#${shortId})*\n\nHi *${recipientName || 'there'}*! *${senderName || 'Your rental partner'}* has signed the LocalDen Friendly Rental Pact for *${gearTitle}* (${booking?.start_date} → ${booking?.end_date}).\n\nPlease tap "E-Sign Pact" in your Dashboard (takes 10 seconds) so both signatures are locked in before handover${handoverPin ? ` (Handover PIN: *${handoverPin}*)` : ''}:\n👉 ${origin}/dashboard`
}

/**
 * Formats a Welcome Message for new users & community members
 */
export function formatWelcomeUserMessage({ user, couponCode = 'WELCOME10', discountPercent = 10 }) {
  const name = user?.full_name || user?.user_metadata?.full_name || 'Friend'
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://localden.online'

  return `━━━━━━━━━━━━━━━━━━━━━
🎉 *WELCOME TO LOCALDEN!* ⚡
━━━━━━━━━━━━━━━━━━━━━
Hey *${name}*, welcome to India's premier community for renting gaming gear, sound systems & creator setups!

🎮 *Rent Flagship Gear:* PS5, VR headsets, DJ rigs, sim wheels & RTX rigs delivered to your doorstep.
🎟️ *Your Welcome Gift:* Use promo code *${couponCode}* at checkout to get *${discountPercent}% OFF* your first rental!
⚡ *Zero Hassle:* Free doorstep delivery, instant KYC verification, and 100% friendly escrow protection.

Ready for your next gaming session?
👉 Browse Gear Now: ${origin}/browse

Have questions or need custom hardware? Just reply right here on WhatsApp!
— Team LocalDen 🚀`
}

/**
 * Formats a "Your Listing is Live" notification message for listers/hosts
 */
export function formatListingLiveMessage({ listing, lister }) {
  const name = lister?.full_name || lister?.user_metadata?.full_name || listing?.profiles?.full_name || 'Host'
  const gearTitle = listing?.title || 'Your Gear'
  const gearEmoji = listing?.emoji || '🎮'
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://localden.online'
  const listingUrl = `${origin}/listing/${listing?.id || ''}`
  const dailyPrice = listing?.price_day ? `₹${Number(listing.price_day).toLocaleString('en-IN')}/day` : 'Set daily'
  const loc = listing?.location || 'LocalDen Marketplace'

  return `━━━━━━━━━━━━━━━━━━━━━
🚀 *YOUR LISTING IS LIVE ON LOCALDEN!*
━━━━━━━━━━━━━━━━━━━━━
Hi *${name}*! Great news — *${gearTitle}* ${gearEmoji} is now officially approved, live, and bookable by gamers in your city!

📦 *Gear:* ${gearTitle}
💰 *Daily Rate:* ${dailyPrice}
📍 *Location:* ${loc}

🔗 *View & Share Your Listing:*
👉 ${listingUrl}

💡 *Pro Host Tips to Get Booked Fast:*
• Share your listing link with friends & social groups
• Keep your WhatsApp notifications active to accept bookings quickly
• Ensure accessories & cables are packed for swift handover

Need any assistance? We're here to help you earn!
— Team LocalDen Hosts ⚡`
}

/**
 * Sends or prepares an in-app notification + WhatsApp alert when a listing goes live
 */
export async function sendListingLiveNotification({ listing, lister, customPhone = null, dispatch = true }) {
  const targetUserId = listing?.user_id || lister?.id
  const gearTitle = listing?.title || 'Gear'
  const phone = customPhone || listing?.contact_phone || lister?.phone || listing?.profiles?.phone || ''
  const message = formatListingLiveMessage({ listing, lister })

  // 1. In-app notification
  if (targetUserId) {
    try {
      await supabase.from('notifications').insert({
        user_id: targetUserId,
        kind: `listing_live_${listing?.id || Date.now()}`,
        title: `🚀 Your listing "${gearTitle}" is live!`,
        body: `Your gear is published and ready for bookings in ${listing?.location || 'your area'}. View and share your listing link with friends!`,
        link: `/listing/${listing?.id || ''}`,
      })
    } catch (err) {
      console.warn('In-app notification for listing live failed:', err?.message)
    }
  }

  // 2. WhatsApp — the listing_live DB trigger sends this automatically; admins can re-send manually
  if (!dispatch) return { success: true, phone, message, waUrl: buildWhatsAppLink(phone, message) }
  const result = await sendWhatsAppNotification({
    phone,
    message,
    event: 'listing_live',
    payload: { listing_id: listing?.id, lister_id: targetUserId },
  })

  return { ...result, phone, message }
}

/**
 * Sends or prepares an in-app notification + WhatsApp alert to welcome a user
 */
export async function sendWelcomeUserNotification({ user, couponCode = 'WELCOME10', discountPercent = 10, customPhone = null, dispatch = true }) {
  const targetUserId = user?.id
  const name = user?.full_name || user?.user_metadata?.full_name || 'there'
  const phone = customPhone || user?.phone || user?.user_metadata?.phone || ''
  const message = formatWelcomeUserMessage({ user, couponCode, discountPercent })

  // 1. In-app notification
  if (targetUserId) {
    try {
      await supabase.from('notifications').insert({
        user_id: targetUserId,
        kind: 'welcome',
        title: '🎉 Welcome to LocalDen!',
        body: `Hey ${name}, your account is ready! Use code ${couponCode} for ${discountPercent}% off your first rental.`,
        link: '/browse',
      })
    } catch (err) {
      console.warn('In-app welcome notification failed:', err?.message)
    }
  }

  // 2. WhatsApp — the welcome DB trigger sends this automatically; admins can re-send manually
  if (!dispatch) return { success: true, phone, message, waUrl: buildWhatsAppLink(phone, message) }
  const result = await sendWhatsAppNotification({
    phone,
    message,
    event: 'user_welcome',
    payload: { user_id: targetUserId, email: user?.email },
  })

  return { ...result, phone, message }
}


/**
 * Fetch WhatsApp settings from site_settings table
 */
export async function fetchWhatsAppSettings() {
  try {
    const { data } = await supabase
      .from('site_settings')
      .select('value')
      .eq('id', SETTING_KEY)
      .maybeSingle()

    if (data?.value) {
      return {
        ...DEFAULT_WHATSAPP_SETTINGS,
        ...data.value,
      }
    }
  } catch (err) {
    console.warn('Failed to load WhatsApp settings from site_settings:', err?.message)
  }
  return DEFAULT_WHATSAPP_SETTINGS
}

/**
 * Save WhatsApp notification settings
 */
export async function saveWhatsAppSettings(settings) {
  const payload = {
    ...DEFAULT_WHATSAPP_SETTINGS,
    ...settings,
    updated_at: new Date().toISOString(),
  }

  const { error } = await supabase.from('site_settings').upsert({
    id: SETTING_KEY,
    value: payload,
    updated_at: new Date().toISOString(),
  })

  if (error) throw error
  return payload
}

/**
 * Sends a WhatsApp message right now through the whatsapp-dispatch edge function
 * (admins only — the webhook URL is a server secret). Everyone else, and any
 * failure, still gets a wa.me link to send it by hand.
 */
export async function sendWhatsAppNotification({ phone, message, event = 'admin_direct', payload = {} }) {
  const cleanPhone = cleanPhoneNumber(phone)
  const waUrl = buildWhatsAppLink(cleanPhone, message)
  let webhookSuccess = false
  let webhookError = null

  if (cleanPhone) {
    try {
      const { data, error } = await supabase.functions.invoke('whatsapp-dispatch', {
        body: { action: 'direct', phone: cleanPhone, message, event, data: payload?.data || payload || {} },
      })
      webhookSuccess = Boolean(data?.ok)
      webhookError = error?.message || data?.error || null
    } catch (err) {
      webhookError = err?.message || 'Dispatch failed'
    }
  }

  return {
    success: true,
    cleanPhone,
    waUrl,
    webhookSuccess,
    webhookError,
  }
}

// ── Admin: automated outbox ───────────────────────────────

export const WA_EVENTS = [
  { group: 'Booking', id: 'booking_placed', label: 'Request sent', to: 'Renter' },
  { group: 'Booking', id: 'booking_requested', label: 'New booking request', to: 'Host' },
  { group: 'Booking', id: 'admin_new_order', label: 'New order alert', to: 'Admin' },
  { group: 'Booking', id: 'booking_confirmed', label: 'Confirmed + handover PIN', to: 'Both' },
  { group: 'Booking', id: 'booking_active', label: 'Handed over + return PIN', to: 'Both' },
  { group: 'Booking', id: 'booking_completed', label: 'Completed + review link', to: 'Both' },
  { group: 'Booking', id: 'booking_cancelled', label: 'Cancelled', to: 'Both' },
  { group: 'Money', id: 'payment_verified', label: 'Payment received', to: 'Renter' },
  { group: 'Money', id: 'deposit_settled', label: 'Deposit refunded / held', to: 'Renter' },
  { group: 'Money', id: 'payout_update', label: 'Payout sent / rejected', to: 'Host' },
  { group: 'Trust', id: 'review_received', label: 'New review received', to: 'Reviewed user' },
  { group: 'Trust', id: 'kyc_update', label: 'KYC verified / rejected', to: 'User' },
  { group: 'Trust', id: 'admin_kyc_submitted', label: 'KYC submitted', to: 'Admin' },
  { group: 'Trust', id: 'welcome', label: 'Welcome on signup', to: 'User' },
  { group: 'Trust', id: 'listing_live', label: 'Listing is live', to: 'Host' },
  { group: 'Reminders', id: 'pickup_reminder', label: 'Pickup tomorrow', to: 'Both' },
  { group: 'Reminders', id: 'return_reminder', label: 'Return due tomorrow', to: 'Renter' },
  { group: 'Reminders', id: 'return_overdue', label: 'Return overdue (3 days)', to: 'Both' },
  { group: 'Reminders', id: 'review_nudge', label: 'Review nudge (2 days later)', to: 'Whoever hasn\'t reviewed' },
]

// Mirrors wa_event_enabled() in whatsapp_automation_migration.sql
const LEGACY_TOGGLE = {
  admin_new_order: 'notify_on_new_order',
  payment_verified: 'notify_on_payment_verified',
  admin_kyc_submitted: 'notify_on_kyc_submit',
  welcome: 'notify_on_user_signup',
  listing_live: 'notify_on_listing_live',
}

export function isEventEnabled(settings, id) {
  const explicit = settings?.events?.[id]
  if (typeof explicit === 'boolean') return explicit
  const legacy = settings?.[LEGACY_TOGGLE[id]]
  if (typeof legacy === 'boolean') return legacy
  return id !== 'admin_kyc_submitted'
}

export async function fetchOutbox({ limit = 50, status = 'all' } = {}) {
  let query = supabase
    .from('whatsapp_outbox')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (status !== 'all') query = query.eq('status', status)
  const { data, error } = await query
  if (error) throw error
  return data || []
}

export async function runDispatch(action = 'process', extra = {}) {
  const { data, error } = await supabase.functions.invoke('whatsapp-dispatch', { body: { action, ...extra } })
  if (error) {
    // Surface the function's JSON error instead of the generic "non-2xx" message
    let detail = error.message
    try {
      const body = await error.context?.json?.()
      if (body?.error) detail = body.error
    } catch {
      /* keep generic message */
    }
    throw new Error(detail)
  }
  return data
}

/**
 * React hook to manage WhatsApp notification settings in Admin UI
 */
export function useWhatsAppSettings() {
  const [settings, setSettings] = useState(DEFAULT_WHATSAPP_SETTINGS)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    fetchWhatsAppSettings().then((res) => {
      if (mounted && res) {
        setSettings(res)
        setLoading(false)
      }
    })
    return () => { mounted = false }
  }, [])

  const save = useCallback(async (newSettings) => {
    const saved = await saveWhatsAppSettings(newSettings)
    setSettings(saved)
    return saved
  }, [])

  return { settings, setSettings, save, loading }
}
