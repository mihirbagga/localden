import { supabase } from './supabase'
import { buildWhatsAppLink, cleanPhoneNumber } from './whatsappSmsService'

export const OPS_ROLES = [
  { id: 'runner', label: '⚡ Delivery Runner', desc: 'Doorstep deliveries & pickup returns' },
  { id: 'picker', label: '📦 Gear Picker', desc: 'Retrieves & inspects items from warehouse racks' },
  { id: 'packer', label: '🛡️ Safety Packer', desc: 'Bubblewraps, seals & packages with OTP labels' },
  { id: 'driver', label: '🚚 Van / Auto Driver', desc: 'Bulk transfers & long-range dispatches' },
  { id: 'supervisor', label: '👔 Shift Supervisor', desc: 'Manages station floor, handovers & returns' },
]

export const SHIFTS = [
  { id: 'morning', label: '🌅 Morning (08:00 - 15:00)' },
  { id: 'evening', label: '🌆 Evening (14:30 - 21:30)' },
  { id: 'both', label: '⚡ Full Day / Double Shift' },
  { id: 'on-call', label: '📱 On-Call / Surge' },
]

export async function fetchOpsStaff(hubId = null) {
  try {
    let query = supabase
      .from('ops_staff')
      .select('*, hub:hubs(id, name, city, address)')
      .order('hired_at', { ascending: false })

    if (hubId && hubId !== 'all') {
      query = query.eq('hub_id', hubId)
    }

    const { data, error } = await query
    if (error || !data) return []
    return data
  } catch (err) {
    console.warn('fetchOpsStaff error:', err)
    return []
  }
}

export async function addOpsStaff(staff) {
  const payload = {
    hub_id: staff.hub_id,
    profile_id: staff.profile_id || null,
    name: staff.name.trim(),
    phone: staff.phone.trim(),
    role: staff.role || 'runner',
    shift: staff.shift || 'morning',
    salary: Number(staff.salary) || 0,
    is_active: typeof staff.is_active === 'boolean' ? staff.is_active : true,
    hired_at: staff.hired_at || new Date().toISOString().slice(0, 10),
    notes: staff.notes?.trim() || '',
  }

  const { data, error } = await supabase
    .from('ops_staff')
    .insert([payload])
    .select('*, hub:hubs(id, name, city, address)')
    .single()

  if (error) throw error
  return data
}

export async function updateOpsStaff(id, updates) {
  const { data, error } = await supabase
    .from('ops_staff')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*, hub:hubs(id, name, city, address)')
    .single()

  if (error) throw error
  return data
}

export async function deleteOpsStaff(id) {
  const { error } = await supabase.from('ops_staff').delete().eq('id', id)
  if (error) throw error
  return true
}

/**
 * Builds a professional WhatsApp welcome/onboarding message for new operations staff
 */
export function buildStaffOnboardingMessage({ staff, hub }) {
  const roleMeta = OPS_ROLES.find((r) => r.id === staff.role) || { label: staff.role }
  const shiftMeta = SHIFTS.find((s) => s.id === staff.shift) || { label: staff.shift }

  return `Welcome to the LocalDen Operations Team, *${staff.name}*! 🎉⚡

You have been onboarded as:
🏷️ *Role:* ${roleMeta.label}
🏢 *Assigned Hub:* ${hub?.name || 'LocalDen Hub'} (${hub?.city || 'Local Area'})
📍 *Station Address:* ${hub?.address || 'See Hub Manager for address'}
⏰ *Shift:* ${shiftMeta.label}
${staff.salary > 0 ? `💵 *Base Compensation:* ₹${Number(staff.salary).toLocaleString('en-IN')}/mo\n` : ''}
Please report to the hub manager on your start date. All handover verification happens via the 4-digit PIN system.

Let's deliver gaming & creator gear with zero friction! 🚀`
}

export function openStaffOnboardingWhatsApp(staff, hub) {
  const message = buildStaffOnboardingMessage({ staff, hub })
  const clean = cleanPhoneNumber(staff.phone)
  return buildWhatsAppLink(clean, message)
}

