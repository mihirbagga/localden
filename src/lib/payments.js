export const METHOD_LABEL = {
  razorpay: 'Razorpay (UPI / Card / Netbanking)',
  qr: 'UPI QR scan',
  upi: 'UPI transfer',
  bank: 'Bank transfer',
  cash: 'Cash on pickup',
  wallet: 'LocalDen Wallet',
}

export function getPaymentMethodLabel(method) {
  if (!method) return 'Not selected'
  const key = String(method).toLowerCase().trim()
  return METHOD_LABEL[key] || (key.charAt(0).toUpperCase() + key.slice(1))
}

export function getPaymentStatusInfo(status, method) {
  const s = String(status || 'pending').toLowerCase()
  const isCash = String(method || '').toLowerCase() === 'cash'

  if (s === 'paid') {
    return {
      label: '✓ Paid',
      tone: 'emerald',
      badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    }
  }
  if (s === 'submitted') {
    return {
      label: '⏳ Verifying',
      tone: 'amber',
      badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse',
    }
  }
  if (s === 'refunded') {
    return {
      label: '↩ Refunded',
      tone: 'cyan',
      badgeClass: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
    }
  }
  if (s === 'failed') {
    return {
      label: '✕ Failed',
      tone: 'red',
      badgeClass: 'bg-red-500/20 text-red-300 border-red-500/40',
    }
  }
  if (isCash) {
    return {
      label: '💵 Pay on Pickup',
      tone: 'amber',
      badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    }
  }
  return {
    label: '⏳ Pending Payment',
    tone: 'muted',
    badgeClass: 'bg-white/10 text-white/60 border-white/20',
  }
}

export function methodConfig(method) {
  return method?.config && typeof method.config === 'object' ? method.config : {}
}

export function isOnlineMethod(method) {
  return method?.method_type === 'razorpay'
}

export function payButtonLabel(method, total) {
  if (!method) return `Pay ₹${total}`
  if (method.method_type === 'razorpay') return `Pay ₹${total} via Razorpay`
  if (method.method_type === 'wallet' || method.id === 'wallet') return `Pay ₹${total} from wallet`
  if (method.method_type === 'cash') return `Book · pay ₹${total} on pickup`
  return `I have paid ₹${total}`
}

export function enabledMethods(list) {
  return (list || []).filter((m) => m.is_enabled).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
}
