export const KYC_ID_TYPES = [
  { id: 'aadhaar', label: 'Aadhaar' },
  { id: 'pan', label: 'PAN' },
]

export function isAdminProfile(profile) {
  return Boolean(
    profile?.is_admin
    || profile?.admin_role === 'admin'
    || profile?.admin_role === 'super_admin'
  )
}

export function isKycVerified(profile) {
  return profile?.kyc_status === 'verified'
}

export function needsKyc(profile) {
  if (!profile) return false
  if (isAdminProfile(profile)) return false
  return !isKycVerified(profile)
}

export function kycActionLabel(status) {
  if (status === 'submitted') return 'KYC is with admin'
  if (status === 'rejected') return 'Fix KYC and resubmit'
  if (status === 'verified') return 'Verified'
  return 'Complete KYC'
}

export function last4Valid(idType, value) {
  const raw = String(value || '').trim().toUpperCase()
  if (idType === 'aadhaar') return /^\d{4}$/.test(raw)
  return /^[A-Z0-9]{4}$/.test(raw)
}

export function normalizeLast4(value) {
  return String(value || '').trim().toUpperCase().slice(0, 4)
}

export function phoneValid(phone) {
  const digits = String(phone || '').replace(/\D/g, '')
  return digits.length === 10 || digits.length === 12
}

export function fileExt(file) {
  const fromName = String(file?.name || '').split('.').pop()?.toLowerCase()
  if (fromName && fromName.length <= 5) return fromName
  if (file?.type === 'image/png') return 'png'
  if (file?.type === 'image/webp') return 'webp'
  return 'jpg'
}
