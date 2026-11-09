export const DEFAULT_PLATFORM_FEE = {
  enabled: true,
  fee_type: 'percent',
  fee_value: 20,
}

export const HUB_STORAGE_FEE_PERCENT = 5

export function isListingHubStored(item) {
  if (!item) return false
  if (item.fulfillment_type === 'warehouse' || item.fulfillmentType === 'warehouse') return true
  if (item.hub_id != null || item.hubId != null) return true
  if (item.listings && isListingHubStored(item.listings)) return true
  if (item.warehouse_note || item.warehouseNote) return true
  return false
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

export function getPlatformFeeBreakdown(subtotal, fee = DEFAULT_PLATFORM_FEE, isHubStored = false) {
  const safeSubtotal = Math.max(0, Number(subtotal) || 0)
  const isHub = Boolean(typeof isHubStored === 'object' ? isListingHubStored(isHubStored) : isHubStored)
  const storageFee = isHub ? Math.round((safeSubtotal * HUB_STORAGE_FEE_PERCENT) / 100) : 0

  const enabled = fee?.enabled !== false
  const value = Number(fee?.fee_value) || 0
  let baseFee = 0

  if (enabled && value > 0) {
    if (fee?.fee_type === 'flat') {
      baseFee = Math.round(value)
    } else {
      baseFee = Math.round((safeSubtotal * value) / 100)
    }
  }

  const totalFee = baseFee + storageFee
  const basePercent = fee?.fee_type === 'percent' && enabled ? value : 0
  const totalPercent = basePercent + (isHub ? HUB_STORAGE_FEE_PERCENT : 0)

  return {
    baseFee,
    storageFee,
    totalFee,
    isHubStored: isHub,
    storagePercent: HUB_STORAGE_FEE_PERCENT,
    basePercent,
    totalPercent,
    feeType: fee?.fee_type || 'percent',
  }
}

export function computePlatformFee(subtotal, fee = DEFAULT_PLATFORM_FEE, isHubStored = false) {
  const breakdown = getPlatformFeeBreakdown(subtotal, fee, isHubStored)
  return breakdown.totalFee
}

export function platformFeeLabel(fee = DEFAULT_PLATFORM_FEE, isHubStored = false) {
  const isHub = Boolean(typeof isHubStored === 'object' ? isListingHubStored(isHubStored) : isHubStored)
  if (isHub) {
    if (!fee?.enabled || !(Number(fee.fee_value) > 0)) {
      return `Hub Storage Fee (${HUB_STORAGE_FEE_PERCENT}%)`
    }
    if (fee.fee_type === 'flat') {
      return `Platform fee (₹${fee.fee_value} + ${HUB_STORAGE_FEE_PERCENT}% Hub Storage)`
    }
    const totalTake = Number(fee.fee_value) + HUB_STORAGE_FEE_PERCENT
    return `Platform fee (${totalTake}% · incl. 5% Hub Storage)`
  }

  if (!fee?.enabled || !(Number(fee.fee_value) > 0)) return 'Platform fee'
  if (fee.fee_type === 'flat') return `Platform fee (₹${fee.fee_value})`
  return `Platform fee (${fee.fee_value}%)`
}

export function platformFeeCopy(fee = DEFAULT_PLATFORM_FEE, isHubStored = false) {
  const isHub = Boolean(typeof isHubStored === 'object' ? isListingHubStored(isHubStored) : isHubStored)
  if (isHub) {
    if (!fee?.enabled || !(Number(fee.fee_value) > 0)) {
      return `LocalDen retains 5% hub storage & maintenance fee. You keep 95% of every rental.`
    }
    if (fee.fee_type === 'flat') {
      return `Platform takes ₹${fee.fee_value} base + 5% Hub storage cut per booking.`
    }
    const baseVal = Number(fee.fee_value)
    const totalTake = baseVal + HUB_STORAGE_FEE_PERCENT
    const keep = Math.max(0, 100 - totalTake)
    return `You keep ${keep}% of every rental. Platform takes ${baseVal}% base + 5% Hub storage cut (Total ${totalTake}%).`
  }

  if (!fee?.enabled || !(Number(fee.fee_value) > 0)) {
    return 'No platform fee. You keep 100% of the rental.'
  }
  if (fee.fee_type === 'flat') {
    return `Platform takes ₹${fee.fee_value} per booking.`
  }
  const keep = Math.max(0, 100 - Number(fee.fee_value))
  return `You keep ${keep}% of every rental. Platform takes ${fee.fee_value}%.`
}

export function platformFeeFaq(fee = DEFAULT_PLATFORM_FEE, isHubStored = false) {
  const isHub = Boolean(typeof isHubStored === 'object' ? isListingHubStored(isHubStored) : isHubStored)
  if (isHub) {
    const baseVal = fee?.enabled ? Number(fee.fee_value) || 0 : 0
    const totalTake = baseVal + HUB_STORAGE_FEE_PERCENT
    const keep = Math.max(0, 100 - totalTake)
    return `For gear stored at LocalDen Hubs, LocalDen keeps an extra 5% storage and handling cut (${baseVal}% base + 5% storage = ${totalTake}% total take). You keep ${keep}%. This covers safe warehouse storage, regular diagnostics, and instant doorstep courier dispatch.`
  }

  if (!fee?.enabled || !(Number(fee.fee_value) > 0)) {
    return 'No platform fee on bookings right now. You keep the full rental amount. Security deposit is still collected and returned after the rental.'
  }
  if (fee.fee_type === 'flat') {
    return `A flat ₹${fee.fee_value} platform fee is added per booking. It covers payment processing, insurance, marketing, and support.`
  }
  const keep = Math.max(0, 100 - Number(fee.fee_value))
  return `You keep ${keep}% of every booking. The ${fee.fee_value}% platform fee covers payment processing, insurance, marketing, and support.`
}
