export const KYC_OPTIONS = ['not_required', 'required', 'submitted', 'verified', 'rejected']
export const BOOKING_STATUSES = ['pending', 'confirmed', 'active', 'completed', 'cancelled', 'disputed']
export const ADMIN_ROLES = ['none', 'admin', 'super_admin']
export const LOW_STOCK_THRESHOLD = 1

export const KYC_LABEL = {
  not_required: 'Not Required',
  required: 'KYC Requested',
  pending: 'Not Required',
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
  pending: 'Pending Approval',
  confirmed: 'Confirmed',
  active: 'Active Rental',
  completed: 'Completed',
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
    return 'Connection to Supabase was interrupted (CORS or network). Check your internet connection or restart the dev server.'
  }
  if (/stock_qty|stock_total|42703|PGRST204|schema cache/i.test(msg)) {
    return 'Stock columns are not yet initialized in your database. Run supabase/listings_columns_migration.sql in the Supabase SQL Editor.'
  }
  if (/coupons|coupon_/i.test(msg) && /does not exist|schema cache|42P01/i.test(msg)) {
    return 'Coupons table is not yet initialized. Run supabase/coupons_migration.sql in the Supabase SQL Editor.'
  }
  if (/payment_methods/i.test(msg) && /does not exist|schema cache|42P01/i.test(msg)) {
    return 'Payment methods table is not yet initialized. Run supabase/payments_migration.sql in the Supabase SQL Editor.'
  }
  if (/site_settings/i.test(msg) && /does not exist|schema cache|42P01/i.test(msg)) {
    return 'Site settings table is not yet initialized. Run supabase/platform_fee_migration.sql in the Supabase SQL Editor.'
  }
  if (/kyc_submissions|kyc-docs|review_kyc/i.test(msg) && /does not exist|schema cache|42P01|bucket/i.test(msg)) {
    return 'KYC tables or storage bucket missing. Run supabase/kyc_migration.sql in the Supabase SQL Editor.'
  }
  if (/row-level security|permission denied|42501/i.test(msg)) {
    return 'Admin permission denied by database policy. Ensure your profile has admin_role set to "admin" or "super_admin".'
  }
  return msg
}
