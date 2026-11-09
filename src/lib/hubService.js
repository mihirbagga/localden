import { supabase } from './supabase'

export const FALLBACK_HUBS = [
  {
    id: 'hub-blr-01',
    name: 'LocalDen Koramangala Hub',
    city_id: 'bengaluru',
    city: 'Bengaluru',
    address: '4th Block, Koramangala, Bengaluru, Karnataka 560034',
    contact_phone: '+91 90346 95091',
    lat: 12.9352,
    lng: 77.6245,
    manager_id: null,
    is_active: true,
    notes: 'Central South Bengaluru storage and pickup station.',
  },
  {
    id: 'hub-ggn-01',
    name: 'LocalDen CyberHub Dispatch',
    city_id: 'gurugram',
    city: 'Gurugram',
    address: 'DLF Cyber City, Phase 2, Gurugram, Haryana 122002',
    contact_phone: '+91 98110 54321',
    lat: 28.4952,
    lng: 77.0895,
    manager_id: null,
    is_active: true,
    notes: 'NCR Dispatch Hub serving Gurgaon & South Delhi.',
  },
]

export async function fetchHubs(cityFilter = null) {
  try {
    let query = supabase
      .from('hubs')
      .select('*, manager:profiles!manager_id(id, full_name, email, phone)')
      .order('city', { ascending: true })

    if (cityFilter && cityFilter !== 'all') {
      query = query.ilike('city', `%${cityFilter}%`)
    }

    const { data, error } = await query
    if (error || !data || data.length === 0) {
      if (cityFilter && cityFilter !== 'all') {
        return FALLBACK_HUBS.filter(
          (h) => h.city.toLowerCase() === cityFilter.toLowerCase()
        )
      }
      return FALLBACK_HUBS
    }
    return data
  } catch (err) {
    console.warn('Fallback hubs due to error:', err)
    return FALLBACK_HUBS
  }
}

export async function createHub(hub) {
  const payload = {
    name: hub.name.trim(),
    city_id: hub.city_id || hub.city?.toLowerCase(),
    city: hub.city.trim(),
    address: hub.address?.trim() || '',
    contact_phone: hub.contact_phone?.trim() || '',
    lat: Number(hub.lat) || 12.9352,
    lng: Number(hub.lng) || 77.6245,
    manager_id: hub.manager_id || null,
    is_active: typeof hub.is_active === 'boolean' ? hub.is_active : true,
    notes: hub.notes?.trim() || '',
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from('hubs')
    .insert([payload])
    .select('*, manager:profiles!manager_id(id, full_name, email, phone)')
    .single()

  if (error) throw error
  return data
}

export async function updateHub(id, updates) {
  const { data, error } = await supabase
    .from('hubs')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*, manager:profiles!manager_id(id, full_name, email, phone)')
    .single()

  if (error) throw error
  return data
}

export async function deleteHub(id) {
  const { error } = await supabase.from('hubs').delete().eq('id', id)
  if (error) throw error
  return true
}

