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

const LOCAL_STORAGE_KEY = 'rent_discount_campaigns'
const UPDATE_EVENT = 'discount-campaigns-updated'

function readCachedSettings() {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object') return parsed
  } catch {}
  return null
}

function writeCachedSettings(payload) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(payload))
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(UPDATE_EVENT, { detail: payload }))
    }
  } catch {}
}

function mergeWithDefaults(raw) {
  if (!raw || typeof raw !== 'object') return DEFAULT_CAMPAIGN_SETTINGS
  const dur = raw.duration_discounts || {}
  return {
    active_campaign: {
      ...DEFAULT_CAMPAIGN_SETTINGS.active_campaign,
      ...(raw.active_campaign || {}),
    },
    duration_discounts: {
      ...DEFAULT_CAMPAIGN_SETTINGS.duration_discounts,
      ...dur,
      enabled: dur.enabled !== false,
      tiers: Array.isArray(dur.tiers) && dur.tiers.length > 0
        ? dur.tiers.map((t) => ({
            days: Math.max(1, Number(t.days) || 1),
            discount_percent: Math.max(0, Math.min(100, Number(t.discount_percent) || 0)),
            label: String(t.label || `${t.days}+ Days`),
          })).sort((a, b) => a.days - b.days)
        : DEFAULT_CAMPAIGN_SETTINGS.duration_discounts.tiers,
    },
  }
}

/**
 * Fetch campaign settings from site_settings with fallback to localStorage & defaults
 */
export async function fetchCampaignSettings() {
  const cached = readCachedSettings()
  try {
    const { data, error } = await supabase
      .from('site_settings')
      .select('*')
      .or(`id.eq.${SETTING_KEY},key.eq.${SETTING_KEY}`)
      .maybeSingle()

    if (!error && data?.value && typeof data.value === 'object') {
      const merged = mergeWithDefaults(data.value)
      writeCachedSettings(merged)
      return merged
    }
  } catch {
    try {
      const { data: fallback } = await supabase
        .from('site_settings')
        .select('value')
        .eq('id', SETTING_KEY)
        .maybeSingle()
      if (fallback?.value && typeof fallback.value === 'object') {
        const merged = mergeWithDefaults(fallback.value)
        writeCachedSettings(merged)
        return merged
      }
    } catch (err) {
      console.warn('Failed to load discount campaigns:', err?.message)
    }
  }

  if (cached) {
    return mergeWithDefaults(cached)
  }
  return DEFAULT_CAMPAIGN_SETTINGS
}

/**
 * Save campaign settings with id/key fallback + localStorage persistence
 */
export async function saveCampaignSettings(settings) {
  const merged = mergeWithDefaults(settings)
  const payload = {
    active_campaign: merged.active_campaign,
    duration_discounts: merged.duration_discounts,
    updated_at: new Date().toISOString(),
  }

  // Always persist locally first so UI & checkout update immediately
  writeCachedSettings(payload)

  let { error } = await supabase.from('site_settings').upsert({
    id: SETTING_KEY,
    value: payload,
    updated_at: new Date().toISOString(),
  })

  if (error && /column "id"/i.test(error.message || '')) {
    const res = await supabase.from('site_settings').upsert({
      key: SETTING_KEY,
      value: payload,
      updated_at: new Date().toISOString(),
    })
    error = res.error
  }

  if (error) {
    console.warn('Supabase site_settings discount_campaigns save note:', error.message)
  }

  // If active campaign is enabled with a code, sync into coupons table
  const camp = merged.active_campaign
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
 * React Hook for Discount Campaigns (auto-syncs across tabs/components)
 */
export function useDiscountCampaigns() {
  const [settings, setSettings] = useState(() => mergeWithDefaults(readCachedSettings()))
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true
    fetchCampaignSettings().then((res) => {
      if (isMounted) {
        setSettings(res)
        setLoading(false)
      }
    })

    const onUpdate = (e) => {
      if (isMounted && e?.detail) {
        setSettings(mergeWithDefaults(e.detail))
      }
    }
    if (typeof window !== 'undefined') {
      window.addEventListener(UPDATE_EVENT, onUpdate)
    }
    return () => {
      isMounted = false
      if (typeof window !== 'undefined') {
        window.removeEventListener(UPDATE_EVENT, onUpdate)
      }
    }
  }, [])

  const save = async (nextSettings) => {
    const saved = await saveCampaignSettings(nextSettings)
    setSettings(mergeWithDefaults(saved))
    return saved
  }

  return { settings, setSettings, save, loading }
}
