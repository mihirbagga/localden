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
 * Dispatches a WhatsApp notification:
 * 1. If webhook_url is configured, sends background POST request (e.g. Zapier, Make, n8n, Twilio, Evolution API)
 * 2. Generates wa.me link for instant manual trigger
 * 3. Logs dispatch to localStorage for auditing
 */
export async function sendWhatsAppNotification({ phone, message, event = 'new_order', payload = {} }) {
  const cleanPhone = cleanPhoneNumber(phone)
  const waUrl = buildWhatsAppLink(cleanPhone, message)
  let webhookSuccess = false
  let webhookError = null

  // If webhook is provided, attempt background dispatch
  if (payload?.webhook_url) {
    try {
      const res = await fetch(payload.webhook_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event,
          recipient_phone: cleanPhone,
          message,
          data: payload.data || {},
          timestamp: new Date().toISOString(),
        }),
      })
      webhookSuccess = res.ok
      if (!res.ok) {
        webhookError = `HTTP ${res.status}`
      }
    } catch (err) {
      console.warn('WhatsApp webhook dispatch error:', err?.message)
      webhookError = err?.message
    }
  }

  // Store log in localStorage
  try {
    const existingLogs = JSON.parse(localStorage.getItem('localden_wa_logs') || '[]')
    const newLog = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      event,
      phone: cleanPhone,
      messagePreview: message.slice(0, 120),
      webhookSuccess,
      webhookError,
    }
    const updatedLogs = [newLog, ...existingLogs].slice(0, 50)
    localStorage.setItem('localden_wa_logs', JSON.stringify(updatedLogs))
  } catch (e) {
    // localStorage might fail in private browsing, safely ignore
  }

  return {
    success: true,
    cleanPhone,
    waUrl,
    webhookSuccess,
    webhookError,
  }
}

/**
 * Primary trigger: Called upon new order creation to alert Admin on WhatsApp
 */
export async function notifyAdminOnNewOrder(orderData) {
  try {
    const settings = await fetchWhatsAppSettings()
    if (!settings.enabled || !settings.notify_on_new_order) {
      return { skipped: true, reason: 'Notifications disabled in settings' }
    }

    const adminPhone = settings.admin_phone || SUPPORT_PHONE_TEL
    const message = formatNewOrderAdminMessage(orderData)

    const result = await sendWhatsAppNotification({
      phone: adminPhone,
      message,
      event: 'new_order',
      payload: {
        webhook_url: settings.webhook_url,
        data: orderData,
      },
    })

    return {
      ...result,
      message,
      adminPhone,
      autoOpen: settings.auto_open_tab,
    }
  } catch (err) {
    console.warn('notifyAdminOnNewOrder error:', err?.message)
    return { success: false, error: err?.message }
  }
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
