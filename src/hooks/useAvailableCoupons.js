import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { availableCoupons, couponFitsUser } from '../lib/coupons'
import { useAuth } from '../contexts/AuthContext'

export function useAvailableCoupons() {
  const { user } = useAuth()
  const [coupons, setCoupons] = useState([])
  const [loading, setLoading] = useState(true)
  const userId = user?.id

  const reload = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
    if (error) {
      setCoupons([])
    } else {
      setCoupons(availableCoupons(data).filter((row) => couponFitsUser(row, userId)))
    }
    setLoading(false)
  }, [userId])

  useEffect(() => {
    reload()
  }, [reload])

  return { coupons, loading, reload }
}
