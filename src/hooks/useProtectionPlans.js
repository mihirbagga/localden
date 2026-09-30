import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { DEFAULT_PROTECTION_PLANS, parseProtectionSettings } from '../lib/protectionPlans'

export function useProtectionPlans() {
  const [plans, setPlans] = useState(DEFAULT_PROTECTION_PLANS)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let unmounted = false
    async function fetchSettings() {
      try {
        const { data, error } = await supabase
          .from('site_settings')
          .select('value')
          .eq('id', 'protection_plans')
          .maybeSingle()

        if (!unmounted) {
          if (!error && data) {
            setPlans(parseProtectionSettings(data))
          } else {
            setPlans(DEFAULT_PROTECTION_PLANS)
          }
        }
      } catch {
        if (!unmounted) setPlans(DEFAULT_PROTECTION_PLANS)
      } finally {
        if (!unmounted) setLoading(false)
      }
    }

    fetchSettings()
    return () => { unmounted = true }
  }, [])

  return { plans, setPlans, loading }
}
