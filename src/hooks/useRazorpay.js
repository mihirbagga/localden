/**
 * useRazorpay — loads the Razorpay checkout script on demand
 * and exposes an openCheckout() function.
 *
 * Usage:
 *   const { openCheckout, loading, error } = useRazorpay()
 *   await openCheckout({ amount, name, description, prefill, onSuccess, onFailure })
 */
import { useState, useCallback } from 'react'

const RAZORPAY_KEY = import.meta.env.VITE_RAZORPAY_KEY_ID

function loadScript(src) {
  return new Promise((resolve) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve(true)
      return
    }
    const script = document.createElement('script')
    script.src = src
    script.onload  = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

export function useRazorpay() {
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)

  const openCheckout = useCallback(async ({
    amount,         // in rupees (will be multiplied by 100 for paise)
    name,           // listing title
    description,    // e.g. "2 days rental"
    prefill = {},   // { name, email, contact }
    notes   = {},   // extra metadata
    keyId,          // optional admin-configured Razorpay key
    onSuccess,      // (paymentId, response) => void
    onFailure,      // (error) => void
  }) => {
    setLoading(true)
    setError(null)

    const loaded = await loadScript('https://checkout.razorpay.com/v1/checkout.js')
    if (!loaded) {
      const msg = 'Razorpay SDK failed to load. Check your internet connection.'
      setError(msg)
      setLoading(false)
      onFailure?.(new Error(msg))
      return
    }

    const resolvedKey = (keyId || RAZORPAY_KEY || '').trim()
    if (!resolvedKey || resolvedKey === 'rzp_test_your_key_id_here') {
      const msg = 'Razorpay key not configured. Add Key ID in Admin → Payments.'
      setError(msg)
      setLoading(false)
      onFailure?.(new Error(msg))
      return
    }

    const options = {
      key:         resolvedKey,
      amount:      Math.round(amount * 100),  // paise
      currency:    'INR',
      name:        'लोकल Den',
      description,
      image:       '/favicon.svg',
      prefill,
      notes,
      theme:       { color: '#ff2e6d' },
      modal: {
        ondismiss: () => {
          setLoading(false)
          onFailure?.(new Error('Payment dismissed'))
        },
      },
      handler: (response) => {
        setLoading(false)
        onSuccess?.(response.razorpay_payment_id, response)
      },
    }

    try {
      const rzp = new window.Razorpay(options)
      rzp.on('payment.failed', (resp) => {
        setLoading(false)
        setError(resp.error.description)
        onFailure?.(resp.error)
      })
      rzp.open()
    } catch (err) {
      setLoading(false)
      setError(err.message)
      onFailure?.(err)
    }
  }, [])

  return { openCheckout, loading, error }
}
