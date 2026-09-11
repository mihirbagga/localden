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
