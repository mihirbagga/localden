export const METHOD_LABEL = {
  razorpay: 'Razorpay',
  qr: 'QR / UPI scan',
  upi: 'UPI ID',
  bank: 'Bank transfer',
  cash: 'Cash on pickup',
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
