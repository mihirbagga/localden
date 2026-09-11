import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { enabledMethods } from '../lib/payments'

export function usePaymentMethods({ enabledOnly = false } = {}) {
  const [methods, setMethods] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const reload = useCallback(async () => {
    setLoading(true)
    const query = supabase
      .from('payment_methods')
      .select('*')
      .order('sort_order', { ascending: true })
    const { data, error: qErr } = await query
    if (qErr) {
      setError(qErr)
      setMethods([])
    } else {
      setError(null)
      setMethods(data || [])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  const visible = enabledOnly ? enabledMethods(methods) : methods

  return { methods: visible, allMethods: methods, loading, error, reload, setMethods }
}
