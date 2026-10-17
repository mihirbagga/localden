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
 * Formats a clean, readable WhatsApp alert message for the Admin when a new booking arrives
 */
export function formatNewOrderAdminMessage({
  bookingId,
  listing,
  renter,
  startDate,
  endDate,
  days,
  total,
  paymentStatus,
  paymentMethod,
  deliveryType,
  deliveryAddress,
  couponCode,
}) {
  const shortId = bookingId ? String(bookingId).slice(0, 8).toUpperCase() : 'PENDING'
  const gearTitle = listing?.title || 'Gaming Gear'
  const gearEmoji = listing?.emoji || '🎮'
  const category = listing?.category ? ` [${listing.category.toUpperCase()}]` : ''
  const renterName = renter?.full_name || renter?.user_metadata?.full_name || renter?.email?.split('@')[0] || 'Customer'
  const renterPhone = renter?.phone || renter?.user_metadata?.phone || 'Not provided'
  const renterEmail = renter?.email || 'N/A'
  const fulfillment = deliveryType === 'delivery' ? '🚚 Home Delivery' : '🏪 Self Pickup'
  const addressText = deliveryAddress ? `\n📍 *Address:* ${typeof deliveryAddress === 'object' ? JSON.stringify(deliveryAddress) : deliveryAddress}` : ''
  const payStatus = paymentStatus === 'paid' ? '✅ PAID' : (paymentStatus === 'submitted' ? '⏳ REF SUBMITTED' : '⚠️ PENDING')
  const couponText = couponCode ? `\n🏷️ *Coupon Applied:* ${couponCode}` : ''
  const adminUrl = typeof window !== 'undefined' ? `${window.location.origin}/admin` : 'https://localden.online/admin'
  const time = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })

  return `🚀 *NEW ORDER RECEIVED on LocalDen!* 🎮
━━━━━━━━━━━━━━━━━━━━━
📦 *Gear:* ${gearEmoji} ${gearTitle}${category}
👤 *Customer:* ${renterName}
📞 *Phone:* ${renterPhone}
📧 *Email:* ${renterEmail}

📅 *Rental Period:* ${startDate} → ${endDate} (${days} day${days === 1 ? '' : 's'})
💰 *Total Amount:* ₹${total} (${payStatus})
💳 *Payment Method:* ${paymentMethod || 'Razorpay / UPI'}${couponText}
${fulfillment}${addressText}
━━━━━━━━━━━━━━━━━━━━━
🆔 *Order ID:* #${shortId}
⏰ *Time:* ${time}
👉 *Open Admin:* ${adminUrl}`
}

/**
 * Formats an order summary message suitable for sending to the customer
 */
export function formatCustomerConfirmationMessage({
  bookingId,
  listing,
  renterName,
  startDate,
  endDate,
  days,
  total,
  deliveryType,
}) {
  const shortId = bookingId ? String(bookingId).slice(0, 8).toUpperCase() : 'BOOKED'
  const gearTitle = listing?.title || 'Gaming Gear'
  const gearEmoji = listing?.emoji || '🎮'
  const name = renterName || 'Gamer'

  return `🎉 *Booking Confirmed with LocalDen!* ${gearEmoji}
━━━━━━━━━━━━━━━━━━━━━
Hey ${name}! Your rental for *${gearTitle}* has been received!

📅 *Rental Dates:* ${startDate} → ${endDate} (${days} days)
💰 *Total Amount:* ₹${total}
🚚 *Fulfillment:* ${deliveryType === 'delivery' ? 'Doorstep Delivery' : 'Self Pickup'}
🆔 *Booking Reference:* #${shortId}

Our team is prepping your gear. For any assistance, reach us anytime on WhatsApp! ⚡
— Team LocalDen`
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
