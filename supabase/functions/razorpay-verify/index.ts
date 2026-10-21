// Verifies the signature Razorpay Checkout returns in the browser and confirms the booking.
// This gives the renter instant confirmation; razorpay-webhook is the safety net.
//
// Secrets: RAZORPAY_KEY_SECRET
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

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
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  try {
    const secret = Deno.env.get('RAZORPAY_KEY_SECRET')
    if (!secret) return json({ error: 'Razorpay is not configured on the server.' }, 500)

    const url = Deno.env.get('SUPABASE_URL')!
    const asUser = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    })
    const { data: userData, error: userErr } = await asUser.auth.getUser()
    if (userErr || !userData?.user) return json({ error: 'Sign in again.' }, 401)

    const { booking_id, razorpay_order_id, razorpay_payment_id, razorpay_signature } = await req.json()
    if (!booking_id || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return json({ error: 'Missing payment details.' }, 400)
    }

    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const { data: b } = await admin
      .from('bookings')
      .select('id, renter_id, razorpay_order_id')
      .eq('id', booking_id)
      .maybeSingle()

    if (!b || b.renter_id !== userData.user.id) return json({ error: 'Booking not found.' }, 404)
    if (b.razorpay_order_id !== razorpay_order_id) return json({ error: 'Order does not match booking.' }, 400)

    const expected = await hmacHex(secret, `${razorpay_order_id}|${razorpay_payment_id}`)
    if (!safeEqual(expected, String(razorpay_signature))) {
      return json({ error: 'Payment signature is invalid.' }, 400)
    }

    const { data: status, error } = await admin.rpc('confirm_booking_payment_system', {
      p_booking_id: booking_id,
      p_razorpay_payment_id: razorpay_payment_id,
      p_amount_paise: null, // order amount was fixed server-side when the order was created
    })
    if (error) {
      console.error('confirm error', error)
      return json({ error: error.message }, 500)
    }

    return json({ status })
  } catch (e) {
    console.error(e)
    return json({ error: 'Unexpected error.' }, 500)
  }
})

