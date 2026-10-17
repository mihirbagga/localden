import { useEffect, useState } from 'react'
import { supabase } from './supabase'

export const SETTING_KEY = 'discount_campaigns'

export const DEFAULT_CAMPAIGN_SETTINGS = {
  active_campaign: {
    enabled: true,
    title: 'Weekend Flash Sale ⚡',
    badge: 'FLASH SALE',
    code: 'FLASH15',
    discount_percent: 15,
    min_subtotal: 500,
    max_discount: 1000,
    description: 'Get 15% OFF on all gaming & music gear with code FLASH15!',
    starts_at: null,
    ends_at: null,
  },
  duration_discounts: {
    enabled: true,
    tiers: [
      { days: 3, discount_percent: 5, label: '3+ Days Jam' },
      { days: 7, discount_percent: 10, label: 'Full Week (7+ Days)' },
      { days: 14, discount_percent: 20, label: 'Fortnight Pro (14+ Days)' },
      { days: 30, discount_percent: 30, label: 'Monthly Pass (30+ Days)' },
    ],
  },
}

export const CAMPAIGN_PRESETS = [
  {
    title: 'Weekend Flash Sale ⚡',
    badge: 'WEEKEND DEAL',
    code: 'WEEKEND15',
    discount_percent: 15,
    min_subtotal: 500,
    max_discount: 1000,
    description: '15% OFF all weekend rentals! Valid Friday through Sunday.',
  },
  {
    title: 'Bangalore & Gurugram Launch 🚀',
    badge: 'CITY LAUNCH',
    code: 'LOCALDEN20',
    discount_percent: 20,
    min_subtotal: 400,
    max_discount: 800,
    description: 'Celebrate our new city hubs! Flat 20% OFF on your first 3 rentals.',
  },
  {
    title: 'Festival & Holiday Special 🎉',
    badge: 'FESTIVAL DROP',
    code: 'FESTIVE25',
    discount_percent: 25,
    min_subtotal: 1000,
    max_discount: 1500,
    description: 'Festival season is here! Get 25% OFF on consoles, DJ sets, & amps.',
  },
  {
    title: 'College Jam & House Party 🎸',
    badge: 'PARTY PACK',
    code: 'JAMNIGHT10',
    discount_percent: 10,
    min_subtotal: 300,
    max_discount: 500,
    description: 'Hosting a jam or house party? Take 10% OFF gear with code JAMNIGHT10.',
  },
]

/**
 * Fetch campaign settings from site_settings with fallback to defaults
 */
export async function fetchCampaignSettings() {
  try {
    const { data } = await supabase
      .from('site_settings')
      .select('value')
      .eq('id', SETTING_KEY)
      .maybeSingle()

    if (data?.value) {
      return {
        active_campaign: {
          ...DEFAULT_CAMPAIGN_SETTINGS.active_campaign,
          ...(data.value.active_campaign || {}),
        },
        duration_discounts: {
          ...DEFAULT_CAMPAIGN_SETTINGS.duration_discounts,
          ...(data.value.duration_discounts || {}),
        },
      }
    }
  } catch (err) {
    console.warn('Failed to load discount campaigns:', err?.message)
  }
  return DEFAULT_CAMPAIGN_SETTINGS
}

/**
 * Save campaign settings and ensure coupon exists in public.coupons table
 */
export async function saveCampaignSettings(settings) {
  const payload = {
    active_campaign: settings.active_campaign,
    duration_discounts: settings.duration_discounts,
    updated_at: new Date().toISOString(),
  }

  const { error } = await supabase.from('site_settings').upsert({
    id: SETTING_KEY,
    value: payload,
    updated_at: new Date().toISOString(),
  })

  if (error) throw error

  // If active campaign is enabled with a code, sync into coupons table
  const camp = settings.active_campaign
  if (camp?.enabled && camp?.code) {
    try {
      const codeClean = String(camp.code).trim().toUpperCase()
      await supabase.from('coupons').upsert({
        code: codeClean,
        description: camp.description || camp.title,
        discount_type: 'percent',
        discount_value: Number(camp.discount_percent) || 10,
        min_subtotal: Number(camp.min_subtotal) || 0,
        max_discount: Number(camp.max_discount) || null,
        starts_at: camp.starts_at || null,
        ends_at: camp.ends_at || null,
        is_active: true,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'code' })
    } catch (cErr) {
      console.warn('Could not auto-sync campaign coupon to coupons table:', cErr?.message)
    }
  }

  return payload
}

/**
 * React Hook for Discount Campaigns
 */
export function useDiscountCampaigns() {
  const [settings, setSettings] = useState(DEFAULT_CAMPAIGN_SETTINGS)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true
    fetchCampaignSettings().then((res) => {
      if (isMounted) {
        setSettings(res)
        setLoading(false)
      }
    })
    return () => { isMounted = false }
  }, [])

  const save = async (nextSettings) => {
    await saveCampaignSettings(nextSettings)
    setSettings(nextSettings)
  }

  return { settings, setSettings, save, loading }
}
