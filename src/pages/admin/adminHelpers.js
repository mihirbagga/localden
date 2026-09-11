export const KYC_OPTIONS = ['pending', 'submitted', 'verified', 'rejected']
export const BOOKING_STATUSES = ['pending', 'confirmed', 'active', 'completed', 'cancelled', 'disputed']
export const ADMIN_ROLES = ['none', 'admin', 'super_admin']
export const LOW_STOCK_THRESHOLD = 1

export const KYC_LABEL = {
  pending: 'Pending',
  submitted: 'Submitted',
  verified: 'Verified',
  rejected: 'Rejected',
}

export const ROLE_LABEL = {
  none: 'User',
  admin: 'User Admin',
  super_admin: 'Overall Admin',
}

export const BOOKING_LABEL = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  active: 'Active',
  completed: 'Done',
  cancelled: 'Cancelled',
  disputed: 'Disputed',
}

export function formatDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function displayName(profile, fallback = 'Unknown') {
  if (!profile) return fallback
  return profile.full_name || profile.email || fallback
}

export function shortId(id) {
  if (!id) return '—'
  return `${String(id).slice(0, 8)}…`
}

export function isLowStock(listing) {
  const qty = listing?.stock_qty
  if (qty == null) return false
  return qty <= LOW_STOCK_THRESHOLD
}

export function explainAdminError(err) {
  const msg = err?.message || String(err || 'Request failed')
  if (/failed to fetch|networkerror|load failed|cors/i.test(msg)) {
    return 'Admin API blocked (CORS/network). Stop Vite, run npm run dev again, confirm VITE_SUPABASE_URL.'
  }
  if (/stock_qty|stock_total|42703|PGRST204|schema cache/i.test(msg)) {
    return 'Stock columns missing. Re-run supabase/admin_migration.sql in Supabase SQL Editor.'
  }
  return msg
}
