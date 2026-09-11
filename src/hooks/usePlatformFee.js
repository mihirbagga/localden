import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { DEFAULT_PLATFORM_FEE, parsePlatformFee } from '../lib/platformFee'

export function usePlatformFee() {
  const [fee, setFee] = useState(DEFAULT_PLATFORM_FEE)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const reload = useCallback(async () => {
    setLoading(true)
    const { data, error: qErr } = await supabase
      .from('site_settings')
      .select('*')
      .eq('id', 'platform_fee')
      .maybeSingle()
    if (qErr) {
      setError(qErr)
      setFee(DEFAULT_PLATFORM_FEE)
    } else {
      setError(null)
      setFee(data ? parsePlatformFee(data) : DEFAULT_PLATFORM_FEE)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  return { fee, loading, error, reload, setFee }
}
