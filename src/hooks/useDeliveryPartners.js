import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { fetchDeliveryPartners } from '../lib/driverService'

export function useDeliveryPartners() {
  const [drivers, setDrivers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const list = await fetchDeliveryPartners()
      setDrivers(list)
      setError(null)
    } catch (err) {
      console.warn('useDeliveryPartners error:', err?.message)
      setError(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    reload()

    // Realtime subscription on site_settings
    const channel = supabase
      .channel('site_settings_drivers')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'site_settings',
          filter: 'id=eq.delivery_partners',
        },
        () => {
          reload()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [reload])

  return { drivers, loading, error, reload }
}
