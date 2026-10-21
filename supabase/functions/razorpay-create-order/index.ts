// Creates a Razorpay order for a pending-first booking.
// The amount always comes from the booking row (never from the browser).
//
// Secrets: RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET
//          (SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY are injected automatically)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  try {
    const keyId = Deno.env.get('RAZORPAY_KEY_ID')
    const keySecret = Deno.env.get('RAZORPAY_KEY_SECRET')
    if (!keyId || !keySecret) return json({ error: 'Razorpay is not configured on the server.' }, 500)

    const url = Deno.env.get('SUPABASE_URL')!
    const authHeader = req.headers.get('Authorization') ?? ''

    const asUser = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: userData, error: userErr } = await asUser.auth.getUser()
    if (userErr || !userData?.user) return json({ error: 'Sign in again.' }, 401)

    const { booking_id } = await req.json()
    if (!booking_id) return json({ error: 'booking_id is required.' }, 400)

    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const { data: b, error: bErr } = await admin
      .from('bookings')
      .select('id, renter_id, status, payment_status, paid_amount, hold_expires_at, razorpay_order_id')
      .eq('id', booking_id)
      .maybeSingle()

    if (bErr || !b) return json({ error: 'Booking not found.' }, 404)
    if (b.renter_id !== userData.user.id) return json({ error: 'Not your booking.' }, 403)
    if (b.status !== 'pending' || b.payment_status !== 'pending') {
      return json({ error: 'This booking is no longer awaiting payment.' }, 409)
    }
    if (b.hold_expires_at && new Date(b.hold_expires_at).getTime() < Date.now()) {
      return json({ error: 'The hold on these dates expired. Please book again.' }, 410)
    }

    const amount = Math.round(Number(b.paid_amount) * 100)
    if (!Number.isFinite(amount) || amount < 100) {
      return json({ error: 'Nothing to pay for this booking.' }, 400)
    }

    // Re-use the order if the renter reopens the payment window
    if (b.razorpay_order_id) {
      return json({
        order_id: b.razorpay_order_id,
        amount,
        key_id: keyId,
        hold_expires_at: b.hold_expires_at,
      })
    }

    const rzp = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Basic ' + btoa(`${keyId}:${keySecret}`),
      },
      body: JSON.stringify({
        amount,
        currency: 'INR',
        receipt: String(b.id).replace(/-/g, '').slice(0, 40),
        notes: { booking_id: b.id },
      }),
    })
    const order = await rzp.json()
    if (!rzp.ok || !order?.id) {
      console.error('Razorpay order error', order)
      return json({ error: order?.error?.description || 'Could not start the payment.' }, 502)
    }

    const { error: updErr } = await admin
      .from('bookings')
      .update({ razorpay_order_id: order.id })
      .eq('id', b.id)
    if (updErr) {
      console.error('Could not store order id', updErr)
      return json({ error: 'Could not start the payment.' }, 500)
    }

    return json({
      order_id: order.id,
      amount,
      key_id: keyId,
      hold_expires_at: b.hold_expires_at,
    })
  } catch (e) {
    console.error(e)
    return json({ error: 'Unexpected error.' }, 500)
  }
})

