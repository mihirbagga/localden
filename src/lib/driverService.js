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

export async function fetchDeliveryPartners() {
  try {
    const { data, error } = await supabase
      .from('site_settings')
      .select('value')
      .eq('id', 'delivery_partners')
      .maybeSingle()

    if (error || !data || !Array.isArray(data.value) || data.value.length === 0) {
      return DEFAULT_DRIVERS
    }
    return data.value
  } catch (err) {
    console.warn('Failed to fetch delivery partners, using defaults:', err?.message)
    return DEFAULT_DRIVERS
  }
}

export async function saveDeliveryPartners(driversList) {
  const { data, error } = await supabase.from('site_settings').upsert({
    id: 'delivery_partners',
    value: driversList,
    updated_at: new Date().toISOString(),
  })
  if (error) throw error
  return data
}

export async function addDeliveryPartner(driverData) {
  const current = await fetchDeliveryPartners()
  const newDriver = {
    id: `drv-${Date.now()}`,
    name: driverData.name.trim(),
    phone: driverData.phone.trim(),
    vehicle_type: driverData.vehicle_type?.trim() || 'Two Wheeler',
    vehicle_number: driverData.vehicle_number?.trim()?.toUpperCase() || 'KA 01 XX 0000',
    area: driverData.area?.trim() || 'Central Bangalore',
    rating: 5.0,
    deliveries_count: 0,
    avatar: driverData.avatar?.trim() || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
    is_active: true,
    created_at: new Date().toISOString(),
  }
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
