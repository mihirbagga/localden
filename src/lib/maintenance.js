import { supabase } from './supabase'

export const MAINTENANCE_TYPES = [
  { id: 'thermal_paste', label: '🔥 Thermal Paste Refreshed', desc: 'Replaced CPU/GPU thermal compound (Noctua/Arctic MX)' },
  { id: 'dust_cleaning', label: '🧹 Deep Dust & Fan Cleaning', desc: 'Compressed air cleaning & fan bearing lubrication' },
  { id: 'os_reinstall', label: '💻 OS Clean Reinstall', desc: 'Fresh Windows/Linux OS format & latest GPU drivers' },
  { id: 'hardware_upgrade', label: '🚀 Hardware Upgrade', desc: 'Added RAM, SSD storage, or replaced cables' },
  { id: 'stress_test', label: '⚡ Stress Test & Benchmark', desc: 'Passed 1-hour FurMark / Cinebench stability test' },
]

export async function fetchMaintenanceLogs(listingId) {
  try {
    const { data, error } = await supabase
      .from('listing_maintenance')
      .select('*')
      .eq('listing_id', listingId)
      .order('serviced_at', { ascending: false })
    if (error) {
      // Fallback to local storage if database table is missing
      const local = JSON.parse(localStorage.getItem(`maint_${listingId}`) || '[]')
      return local
    }
    return data || []
  } catch {
    const local = JSON.parse(localStorage.getItem(`maint_${listingId}`) || '[]')
    return local
  }
}

export async function addMaintenanceLog({ listingId, serviceType, notes, servicedAt }) {
  const row = {
    listing_id: listingId,
    service_type: serviceType,
    notes: notes || null,
    serviced_at: servicedAt || new Date().toISOString().split('T')[0],
    created_at: new Date().toISOString(),
  }

  try {
    const { data, error } = await supabase
      .from('listing_maintenance')
      .insert(row)
      .select()
      .single()

    if (error) throw error
    return data
  } catch {
    // Save to local storage as fallback
    const local = JSON.parse(localStorage.getItem(`maint_${listingId}`) || '[]')
    const next = [{ ...row, id: `local_${Date.now()}` }, ...local]
    localStorage.setItem(`maint_${listingId}`, JSON.stringify(next))
    return next[0]
  }
}
