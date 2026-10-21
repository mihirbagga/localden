import { computePlatformFee } from './platformFee'

export function normalizeCouponCode(code) {
  return String(code || '').trim().toUpperCase()
}

export function welcomeCouponCode(fullName, percent = 50) {
  const first = String(fullName || '').trim().split(/\s+/)[0] || ''
  let slug = first.replace(/[^A-Za-z0-9]/g, '').toUpperCase()
  if (!slug) slug = 'USER'
  if (slug.length > 12) slug = slug.slice(0, 12)
  const val = Number.isFinite(Number(percent)) ? Number(percent) : 50
  return `WELCOME${slug}${val}`
}

export function computeDiscount(coupon, subtotal) {
  if (!coupon || subtotal <= 0) return 0
  if (coupon.discount_type === 'percent') {
    let off = Math.round(subtotal * (Number(coupon.discount_value) || 0) / 100)
    if (coupon.max_discount) off = Math.min(off, Number(coupon.max_discount))
    return Math.min(off, subtotal)
  }
  return Math.min(Number(coupon.discount_value) || 0, subtotal)
}

export function couponWindowError(coupon) {
  if (!coupon) return 'Coupon not found.'
  if (!coupon.is_active) return 'Coupon is inactive.'
  const now = Date.now()
  if (coupon.starts_at && new Date(coupon.starts_at).getTime() > now) {
    return 'Coupon not started yet.'
  }
  if (coupon.ends_at && new Date(coupon.ends_at).getTime() < now) {
    return 'Coupon expired.'
  }
  if (coupon.usage_limit != null && Number(coupon.used_count) >= Number(coupon.usage_limit)) {
    return 'Coupon usage limit reached.'
  }
  return null
}

export function validateCoupon(coupon, subtotal, userId) {
  const windowErr = couponWindowError(coupon)
  if (windowErr) return windowErr
  if (coupon.owner_id && coupon.owner_id !== userId) {
    return 'This welcome coupon is for another account.'
  }
  const minSub = Number(coupon.min_subtotal) || 0
  if (minSub > 0 && subtotal < minSub) {
    return `Min rental ₹${minSub} required.`
  }
  return null
}

export function availableCoupons(list) {
  return (list || []).filter((coupon) => !couponWindowError(coupon))
}

export function couponLockReason(coupon, subtotal, userId) {
  const windowErr = couponWindowError(coupon)
  if (windowErr) return windowErr
  if (!(subtotal > 0)) return 'Select dates to apply.'
  return validateCoupon(coupon, subtotal, userId)
}

export function couponFitsUser(coupon, userId) {
  return Boolean(userId && coupon?.owner_id === userId)
}

export function getActiveDurationRate(days, durationDiscounts) {
  const d = Math.max(0, Number(days) || 0)
  if (d <= 0) return { rate: 0, tier: null }

  let config = durationDiscounts
  if (!config) {
    try {
      const raw = localStorage.getItem('rent_discount_campaigns')
      if (raw) {
        const parsed = JSON.parse(raw)
        if (parsed?.duration_discounts) config = parsed.duration_discounts
      }
    } catch {}
  }

  if (config && config.enabled === false) {
    return { rate: 0, tier: null }
  }

  const tiers = Array.isArray(config?.tiers) && config.tiers.length > 0
    ? [...config.tiers].sort((a, b) => Number(b.days) - Number(a.days))
    : [
        { days: 30, discount_percent: 30, label: 'Monthly Pass (30+ Days)' },
        { days: 14, discount_percent: 20, label: 'Fortnight Pro (14+ Days)' },
        { days: 7, discount_percent: 10, label: 'Full Week (7+ Days)' },
        { days: 3, discount_percent: 5, label: '3+ Days Jam' },
      ]

  const matched = tiers.find((t) => d >= Number(t.days))
  if (!matched) return { rate: 0, tier: null }
  const pct = Math.max(0, Math.min(100, Number(matched.discount_percent) || 0))
  return { rate: pct / 100, tier: matched }
}

export function priceWithCoupon({
  days,
  priceDay,
  priceWeekend = 0,
  priceWeek = 0,
  deposit,
  coupon,
  fee,
  protectionCost = 0,
  durationDiscounts = null,
}) {
  const d = Math.max(0, Number(days) || 0)
  const pd = Math.max(0, Number(priceDay) || 0)
  const pWknd = Math.max(0, Number(priceWeekend) || 0)
  const pWeek = Math.max(0, Number(priceWeek) || 0)
  const subtotal = d * pd

  const { rate: tierRate, tier: durationTier } = getActiveDurationRate(d, durationDiscounts)
  const tierDiscount = Math.round(subtotal * tierRate)

  // Check listing-level multi-day bundle rate (Weekend 2d or Weekly 7d) if configured by lister
  let listingBundleDiscount = 0
  if (d >= 7 && pWeek > 0 && pWeek < pd * 7) {
    const weeklyDailyRate = pWeek / 7
    listingBundleDiscount = Math.max(0, Math.round(subtotal - d * weeklyDailyRate))
  } else if (d >= 2 && d < 7 && pWknd > 0 && pWknd < pd * 2) {
    const wkndDailyRate = pWknd / 2
    listingBundleDiscount = Math.max(0, Math.round(subtotal - d * wkndDailyRate))
  }

  const durationDiscount = Math.max(tierDiscount, listingBundleDiscount)
  const discountRate = subtotal > 0 ? durationDiscount / subtotal : tierRate
  const subtotalAfterDuration = Math.max(0, subtotal - durationDiscount)

  const couponDiscount = computeDiscount(coupon, subtotalAfterDuration)
  const netRent = Math.max(0, subtotalAfterDuration - couponDiscount)

  const platformFee = computePlatformFee(netRent, fee)
  const safeDeposit = Math.max(0, Number(deposit) || 0)
  const safeProtection = Math.max(0, Number(protectionCost) || 0)
  const totalDiscount = durationDiscount + couponDiscount

  return {
    days: d,
    subtotal,
    durationDiscount,
    discountRate,
    durationTier,
    couponDiscount,
    discount: totalDiscount,
    totalDiscount,
    subtotalAfterDuration,
    discountedSubtotal: netRent,
    netRent,
    platformFee,
    deposit: safeDeposit,
    protectionCost: safeProtection,
    total: netRent + platformFee + safeDeposit + safeProtection,
  }
}

export function formatCouponValue(coupon) {
  if (!coupon) return '—'
  if (coupon.discount_type === 'percent') return `${coupon.discount_value}%`
  return `₹${coupon.discount_value}`
}
