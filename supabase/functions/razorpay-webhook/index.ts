// Razorpay webhook: the source of truth for "money arrived".
// Deploy WITHOUT JWT verification (Razorpay cannot send a Supabase JWT):
//   supabase functions deploy razorpay-webhook --no-verify-jwt
//
// In Razorpay Dashboard → Settings → Webhooks, add:
//   URL:    https://<project-ref>.supabase.co/functions/v1/razorpay-webhook
//   Events: payment.captured, order.paid
//   Secret: same value as RAZORPAY_WEBHOOK_SECRET
//
// Secrets: RAZORPAY_WEBHOOK_SECRET
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

async function hmacHex(secret: string, message: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message))
  return Array.from(new Uint8Array(sig), (x) => x.toString(16).padStart(2, '0')).join('')
}

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  const secret = Deno.env.get('RAZORPAY_WEBHOOK_SECRET')
  if (!secret) return new Response('Webhook not configured', { status: 500 })

  const raw = await req.text()
  const signature = req.headers.get('x-razorpay-signature') ?? ''
  const expected = await hmacHex(secret, raw)
  if (!safeEqual(expected, signature)) {
    return new Response('Invalid signature', { status: 400 })
  }

  let event: any
  try {
    event = JSON.parse(raw)
  } catch {
    return new Response('Bad payload', { status: 400 })
  }

  if (!['payment.captured', 'order.paid'].includes(event?.event)) {
    return new Response('ignored', { status: 200 })
  }

  const payment = event?.payload?.payment?.entity
  const orderId: string | undefined = payment?.order_id ?? event?.payload?.order?.entity?.id
  const paymentId: string | undefined = payment?.id
  const amount: number | undefined = payment?.amount

  if (!orderId || !paymentId) return new Response('ignored', { status: 200 })

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const { data: b } = await admin
    .from('bookings')
    .select('id')
    .eq('razorpay_order_id', orderId)
    .maybeSingle()

  if (!b) {
    console.warn('Webhook for unknown order', orderId)
    return new Response('unknown order', { status: 200 })
  }

  const { data: status, error } = await admin.rpc('confirm_booking_payment_system', {
    p_booking_id: b.id,
    p_razorpay_payment_id: paymentId,
    p_amount_paise: amount ?? null,
  })

  if (error) {
    // Non-2xx makes Razorpay retry, which is what we want for transient failures.
    console.error('confirm error', error)
    return new Response('confirm failed', { status: 500 })
  }

  return new Response(String(status), { status: 200 })
})

