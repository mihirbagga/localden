export const REFERRER_REWARD = 200
export const REFEREE_REWARD = 100
export const REF_STORAGE_KEY = 'ldRef'

export function normalizeReferralCode(code) {
  return String(code || '').trim().toUpperCase()
}

export function readStoredReferral() {
  try {
    return normalizeReferralCode(localStorage.getItem(REF_STORAGE_KEY) || '')
  } catch {
    return ''
  }
}

export function storeReferralCode(code) {
  const next = normalizeReferralCode(code)
  if (!next) return
  try { localStorage.setItem(REF_STORAGE_KEY, next) } catch { /* ignore */ }
}

export function clearStoredReferral() {
  try { localStorage.removeItem(REF_STORAGE_KEY) } catch { /* ignore */ }
}

export function captureReferralFromSearch(search = window.location.search) {
  const code = normalizeReferralCode(new URLSearchParams(search).get('ref'))
  if (code) storeReferralCode(code)
  return code
}

export async function applyStoredReferral(supabase) {
  const code = readStoredReferral()
  if (!code) return false
  const { data, error } = await supabase.rpc('apply_referral', { p_code: code })
  if (error && !/schema cache|does not exist|Could not find/i.test(error.message || '')) {
    console.warn('Referral:', error.message)
    return false
  }
  if (error) return false
  if (data) clearStoredReferral()
  return Boolean(data)
}

export function referralLink(code) {
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  return `${origin}/signup?ref=${encodeURIComponent(code || '')}`
}
