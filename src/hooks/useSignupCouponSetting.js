import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { DEFAULT_SIGNUP_COUPON_SETTING, parseSignupCouponSetting } from '../lib/signupCouponSetting'

export function useSignupCouponSetting() {
  const [setting, setSetting] = useState(DEFAULT_SIGNUP_COUPON_SETTING)
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('site_settings')
      .select('*')
      .eq('id', 'signup_coupon')
      .maybeSingle()
    if (error || !data) {
      setSetting(DEFAULT_SIGNUP_COUPON_SETTING)
    } else {
      setSetting(parseSignupCouponSetting(data))
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  return { setting, setSetting, loading, reload }
}
