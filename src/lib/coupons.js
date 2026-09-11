import { computePlatformFee } from './platformFee'

export function normalizeCouponCode(code) {
  return String(code || '').trim().toUpperCase()
}

export function welcomeCouponCode(fullName) {
  const first = String(fullName || '').trim().split(/\s+/)[0] || ''
  let slug = first.replace(/[^A-Za-z0-9]/g, '').toUpperCase()
  if (!slug) slug = 'USER'
  if (slug.length > 12) slug = slug.slice(0, 12)
  return `WELCOME${slug}50`
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

export function priceWithCoupon({ days, priceDay, deposit, coupon, fee }) {
  const subtotal = days * (priceDay || 0)
  const discount = computeDiscount(coupon, subtotal)
  const discountedSubtotal = Math.max(0, subtotal - discount)
  const platformFee = computePlatformFee(discountedSubtotal, fee)
  const safeDeposit = deposit || 0
  return {
    subtotal,
    discount,
    discountedSubtotal,
    platformFee,
    deposit: safeDeposit,
    total: discountedSubtotal + platformFee + safeDeposit,
  }
}

export function formatCouponValue(coupon) {
  if (!coupon) return '—'
  if (coupon.discount_type === 'percent') return `${coupon.discount_value}%`
  return `₹${coupon.discount_value}`
}
