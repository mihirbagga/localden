import { supabase } from './supabase'

export const DEFAULT_DRIVERS = [
  {
    id: 'drv-01',
    name: 'Vikram Singh',
    phone: '+91 98450 12345',
    vehicle_type: 'Ather 450X (EV)',
    vehicle_number: 'KA 01 AB 8821',
    area: 'Indiranagar / Koramangala Hub',
    rating: 4.95,
    deliveries_count: 184,
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
    is_active: true,
  },
  {
    id: 'drv-02',
    name: 'Farhan Akhtar',
    phone: '+91 97412 88390',
    vehicle_type: 'Honda Activa 6G',
    vehicle_number: 'KA 03 EV 4410',
    area: 'HSR Layout / Bellandur',
    rating: 4.88,
    deliveries_count: 142,
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
    is_active: true,
  },
  {
    id: 'drv-03',
    name: 'Rajesh Nair',
    phone: '+91 99001 55672',
    vehicle_type: 'Tata Ace Delivery Van',
    vehicle_number: 'KA 04 DL 9012',
    area: 'Whitefield / Electronic City',
    rating: 4.92,
    deliveries_count: 215,
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80',
    is_active: true,
  },
]

/**
 * Normalizes a driver object to standard schema regardless of
 * field names stored in site_settings (e.g. driver_name vs name)
 */
export function normalizeDriver(d, idx = 0) {
  if (!d || typeof d !== 'object') return null
  return {
    id: String(d.id || d.driver_id || `drv-${idx + 1}`),
    name: String(d.name || d.driver_name || d.full_name || 'Delivery Partner').trim(),
    phone: String(d.phone || d.driver_phone || d.mobile || d.contact || '+91 98765 43210').trim(),
    vehicle_type: String(d.vehicle_type || d.vehicle || d.type || 'Two Wheeler').trim(),
    vehicle_number: String(d.vehicle_number || d.vehicle_no || d.plate_number || d.plate || 'KA 01 AB 0000').trim().toUpperCase(),
    area: String(d.area || d.location || d.hub || 'Central Bangalore').trim(),
    rating: Number(d.rating || d.stars || 4.9),
    deliveries_count: Number(d.deliveries_count || d.total_deliveries || 0),
    avatar: String(d.avatar || d.image || d.photo || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80'),
    is_active: typeof d.is_active === 'boolean' ? d.is_active : true,
    created_at: d.created_at || new Date().toISOString(),
  }
}

/**
 * Parses raw site_settings record into a clean list of delivery partners
 */
export function parseDriversFromSetting(rawVal) {
  if (!rawVal) return null

  let parsed = rawVal
  if (typeof rawVal === 'string') {
    try {
      parsed = JSON.parse(rawVal)
    } catch {
      return null
    }
  }

  let list = []
  if (Array.isArray(parsed)) {
    list = parsed
  } else if (parsed && typeof parsed === 'object') {
    if (Array.isArray(parsed.partners)) list = parsed.partners
    else if (Array.isArray(parsed.drivers)) list = parsed.drivers
    else if (Array.isArray(parsed.list)) list = parsed.list
    else if (Array.isArray(parsed.data)) list = parsed.data
    else list = Object.values(parsed)
  }

  return list.map(normalizeDriver).filter(Boolean)
}

/**
 * Reads delivery partners directly from site_settings table
 */
export async function fetchDeliveryPartners() {
  try {
    // 1. Try 'delivery_partners' key
    const { data, error } = await supabase
      .from('site_settings')
      .select('value')
      .eq('id', 'delivery_partners')
      .maybeSingle()

    if (!error && data?.value) {
      const parsed = parseDriversFromSetting(data.value)
      if (parsed) return parsed
    }

    // 2. Fallback check for 'delivery_partner' singular key
    const { data: singularData } = await supabase
      .from('site_settings')
      .select('value')
      .eq('id', 'delivery_partner')
      .maybeSingle()

    if (singularData?.value) {
      const parsed = parseDriversFromSetting(singularData.value)
      if (parsed) return parsed
    }

    // 3. If setting doesn't exist yet, seed site_settings with default drivers
    await saveDeliveryPartners(DEFAULT_DRIVERS)
    return DEFAULT_DRIVERS
  } catch (err) {
    console.warn('Failed to read delivery partners from site_settings:', err?.message)
    return DEFAULT_DRIVERS
  }
}

/**
 * Saves delivery partners directly to site_settings table
 */
export async function saveDeliveryPartners(driversList) {
  const cleanList = (driversList || []).map(normalizeDriver).filter(Boolean)
  const { data, error } = await supabase.from('site_settings').upsert({
    id: 'delivery_partners',
    value: cleanList,
    updated_at: new Date().toISOString(),
  })
  if (error) throw error
  return cleanList
}

export async function addDeliveryPartner(driverData) {
  const current = await fetchDeliveryPartners()
  const newDriver = normalizeDriver({
    id: `drv-${Date.now()}`,
    name: driverData.name,
    phone: driverData.phone,
    vehicle_type: driverData.vehicle_type || 'Electric Scooter',
    vehicle_number: driverData.vehicle_number || 'KA 01 AB 0000',
    area: driverData.area || 'Bangalore Hub',
    avatar: driverData.avatar,
    rating: 5.0,
    deliveries_count: 0,
    is_active: true,
    created_at: new Date().toISOString(),
  })
  const updated = [newDriver, ...current]
  await saveDeliveryPartners(updated)
  return newDriver
}

export async function updateDeliveryPartner(driverId, patch) {
  const current = await fetchDeliveryPartners()
  const updated = current.map((d) => (d.id === driverId ? { ...d, ...patch } : d))
  await saveDeliveryPartners(updated)
  return updated.find((d) => d.id === driverId)
}

export async function deleteDeliveryPartner(driverId) {
  const current = await fetchDeliveryPartners()
  const updated = current.filter((d) => d.id !== driverId)
  await saveDeliveryPartners(updated)
  return true
}
