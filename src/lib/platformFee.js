export const DEFAULT_PLATFORM_FEE = {
  enabled: true,
  fee_type: 'percent',
  fee_value: 20,
}

export function parsePlatformFee(row) {
  const raw = row?.value && typeof row.value === 'object' ? row.value : {}
  const feeType = raw.fee_type === 'flat' ? 'flat' : 'percent'
  const feeValue = Number(raw.fee_value)
  return {
    enabled: raw.enabled !== false,
    fee_type: feeType,
    fee_value: Number.isFinite(feeValue) ? feeValue : DEFAULT_PLATFORM_FEE.fee_value,
  }
}

export function computePlatformFee(subtotal, fee = DEFAULT_PLATFORM_FEE) {
  if (!fee?.enabled) return 0
  const value = Number(fee.fee_value) || 0
  if (value <= 0) return 0
  if (fee.fee_type === 'flat') return Math.round(value)
  return Math.round(Math.max(0, subtotal) * value / 100)
}

export function platformFeeLabel(fee = DEFAULT_PLATFORM_FEE) {
  if (!fee?.enabled || !(Number(fee.fee_value) > 0)) return 'Platform fee'
  if (fee.fee_type === 'flat') return `Platform fee (₹${fee.fee_value})`
  return `Platform fee (${fee.fee_value}%)`
}

export function platformFeeCopy(fee = DEFAULT_PLATFORM_FEE) {
  if (!fee?.enabled || !(Number(fee.fee_value) > 0)) {
    return 'No platform fee. You keep 100% of the rental.'
  }
  if (fee.fee_type === 'flat') {
    return `Platform takes ₹${fee.fee_value} per booking.`
  }
  const keep = Math.max(0, 100 - Number(fee.fee_value))
  return `You keep ${keep}% of every rental. Platform takes ${fee.fee_value}%.`
}

export function platformFeeFaq(fee = DEFAULT_PLATFORM_FEE) {
  if (!fee?.enabled || !(Number(fee.fee_value) > 0)) {
    return 'No platform fee on bookings right now. You keep the full rental amount. Security deposit is still collected and returned after the rental.'
  }
  if (fee.fee_type === 'flat') {
    return `A flat ₹${fee.fee_value} platform fee is added per booking. It covers payment processing, insurance, marketing, and support.`
  }
  const keep = Math.max(0, 100 - Number(fee.fee_value))
  return `You keep ${keep}% of every booking. The ${fee.fee_value}% platform fee covers payment processing, insurance, marketing, and support.`
}
