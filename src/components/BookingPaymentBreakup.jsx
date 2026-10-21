import { useState } from 'react'
import { ChevronDown, ChevronUp, ShieldCheck, Wallet, Truck, Tag, Info } from 'lucide-react'

/**
 * Robust extractor for financial breakup details from a booking row,
 * supporting dedicated columns as well as string fallbacks from renter_note.
 */
export function parseBookingFinancials(booking) {
  if (!booking) {
    return {
      subtotal: 0,
      deliveryFee: 0,
      deliveryDistanceKm: 0,
      warehouseNote: '',
      deposit: 0,
      insuranceAmount: 0,
      discountAmount: 0,
      walletAmount: 0,
      totalAmount: 0,
      paidAmount: 0,
      platformFee: 0,
      hostEarnings: 0,
      couponCode: null,
      paymentMethod: 'upi',
      paymentStatus: 'pending',
      deliveryType: 'pickup',
    }
  }

  let subtotal = Number(booking.subtotal ?? 0)
  if (!subtotal) {
    const dailyPrice = Number(booking.price_per_day || booking.listings?.price_day || 0)
    const days = Number(booking.total_days || 1)
    subtotal = dailyPrice * days
  }

  let deliveryFee = Number(booking.delivery_fee ?? 0)
  let deliveryDistanceKm = Number(booking.delivery_distance_km ?? 0)
  let warehouseNote = booking.warehouse_note || ''
  let deposit = Number(booking.deposit ?? 0)
  let insuranceAmount = Number(booking.insurance_amount ?? 0)
  let discountAmount = Number(booking.discount_amount ?? 0)
  let walletAmount = Number(booking.wallet_amount ?? 0)
  let totalAmount = Number(booking.total_amount ?? 0)
  let platformFee = Number(booking.platform_fee ?? 0)

  // Fallback extraction from renter_note if dedicated columns weren't populated
  if (booking.renter_note && typeof booking.renter_note === 'string') {
    const note = booking.renter_note
    if (!deliveryFee) {
      const delMatch = note.match(/Delivery ₹(\d+(?:\.\d+)?)/i)
      if (delMatch) deliveryFee = Number(delMatch[1])
    }
    if (!deliveryDistanceKm) {
      const distMatch = note.match(/~(\d+(?:\.\d+)?)km/i)
      if (distMatch) deliveryDistanceKm = Number(distMatch[1])
    }
    if (!walletAmount) {
      const walMatch = note.match(/Wallet ₹(\d+(?:\.\d+)?)/i)
      if (walMatch) walletAmount = Number(walMatch[1])
    }
    if (!deposit) {
      const depMatch = note.match(/Dep ₹(\d+(?:\.\d+)?)/i)
      if (depMatch) deposit = Number(depMatch[1])
    }
    if (!warehouseNote) {
      const noteMatch = note.match(/Warehouse: ([^\]]+)/i)
      if (noteMatch) warehouseNote = noteMatch[1].trim()
    }
  }

  let paidAmount = booking.paid_amount !== undefined && booking.paid_amount !== null
    ? Number(booking.paid_amount)
    : Math.max(0, totalAmount - walletAmount)

  const hostEarnings = Math.max(0, subtotal - platformFee)

  return {
    subtotal,
    deliveryFee,
    deliveryDistanceKm,
    warehouseNote,
    deposit,
    insuranceAmount,
    discountAmount,
    walletAmount,
    totalAmount,
    paidAmount,
    platformFee,
    hostEarnings,
    couponCode: booking.coupon_code || null,
    paymentMethod: booking.payment_method || 'upi',
    paymentStatus: booking.payment_status || 'pending',
    deliveryType: booking.delivery_type || 'pickup',
  }
}

export default function BookingPaymentBreakup({
  booking,
  role = 'renter', // 'renter' | 'lister' | 'admin'
  defaultExpanded = false,
  className = '',
}) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const fin = parseBookingFinancials(booking)

  const isLister = role === 'lister'
  const isAdmin = role === 'admin'

  return (
    <div className={`rounded-xl border border-white/10 bg-black/40 overflow-hidden text-xs ${className}`}>
      {/* Header bar / Quick summary */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full px-3 py-2.5 flex items-center justify-between gap-2 hover:bg-white/[0.04] transition-colors text-left"
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-white/80 flex items-center gap-1.5">
            💳 Payment Breakup
          </span>
          {fin.walletAmount > 0 && (
            <span className="px-1.5 py-0.5 rounded text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/30 font-bold flex items-center gap-1">
              <Wallet size={10} /> ₹{fin.walletAmount} Wallet
            </span>
          )}
          {fin.deliveryFee > 0 && (
            <span className="px-1.5 py-0.5 rounded text-[10px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-bold flex items-center gap-1">
              <Truck size={10} /> ₹{fin.deliveryFee} Delivery
            </span>
          )}
          {isLister && (
            <span className="px-2 py-0.5 rounded text-[11px] bg-emerald-500/20 text-emerald-300 font-extrabold border border-emerald-500/30">
              Host Earns ₹{fin.hostEarnings}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="font-mono font-bold text-white text-sm">
            ₹{fin.totalAmount}
          </span>
          {expanded ? <ChevronUp size={14} className="text-white/60" /> : <ChevronDown size={14} className="text-white/60" />}
        </div>
      </button>

      {/* Expanded itemized breakdown */}
      {expanded && (
        <div className="p-3 pt-1 border-t border-white/10 space-y-2 bg-black/25">
          {/* Base Rental */}
          <div className="flex items-center justify-between text-white/75">
            <span>
              Base Gear Rental ({booking.total_days || 1} day{booking.total_days === 1 ? '' : 's'})
            </span>
            <span className="font-mono text-white font-medium">₹{fin.subtotal}</span>
          </div>

          {/* Doorstep Delivery Fee */}
          {fin.deliveryType === 'delivery' && (
            <div className="flex items-start justify-between text-white/75">
              <div>
                <span className="flex items-center gap-1">
                  <Truck size={11} className="text-cyan-400" />
                  Doorstep Delivery
                  {fin.deliveryDistanceKm > 0 && (
                    <span className="text-white/45 text-[10px]"> (~{fin.deliveryDistanceKm} km from hub)</span>
                  )}
                </span>
                {fin.warehouseNote && (
                  <p className="text-[10px] text-cyan-300/80 italic mt-0.5 flex items-center gap-1">
                    <Info size={9} /> Note: {fin.warehouseNote}
                  </p>
                )}
              </div>
              <span className="font-mono text-white font-medium">
                {fin.deliveryFee > 0 ? `+ ₹${fin.deliveryFee}` : 'FREE'}
              </span>
            </div>
          )}

          {/* Security Deposit */}
          {fin.deposit > 0 && (
            <div className="flex items-center justify-between text-white/75">
              <span className="flex items-center gap-1">
                <ShieldCheck size={11} className="text-emerald-400" />
                Refundable Security Deposit
                <span className="text-[10px] text-white/40">(Escrow)</span>
              </span>
              <span className="font-mono text-emerald-300 font-medium">+ ₹{fin.deposit}</span>
            </div>
          )}

          {/* Damage Protection */}
          {fin.insuranceAmount > 0 && (
            <div className="flex items-center justify-between text-white/75">
              <span>Peace-of-Mind Protection</span>
              <span className="font-mono text-white font-medium">+ ₹{fin.insuranceAmount}</span>
            </div>
          )}

          {/* Promo / Coupon Discount */}
          {fin.discountAmount > 0 && (
            <div className="flex items-center justify-between text-emerald-400">
              <span className="flex items-center gap-1">
                <Tag size={11} />
                Promo Discount {fin.couponCode ? `(${fin.couponCode})` : ''}
              </span>
              <span className="font-mono font-medium">- ₹{fin.discountAmount}</span>
            </div>
          )}

          {/* Wallet Balance Applied */}
          {fin.walletAmount > 0 && (
            <div className="flex items-center justify-between text-purple-300 bg-purple-500/10 px-2 py-1 rounded-lg border border-purple-500/20">
              <span className="flex items-center gap-1 font-semibold">
                <Wallet size={11} />
                Wallet Credits Applied
              </span>
              <span className="font-mono font-bold">- ₹{fin.walletAmount}</span>
            </div>
          )}

          {/* Grand Total Divider */}
          <div className="pt-2 border-t border-white/10 flex items-center justify-between text-sm">
            <span className="font-bold text-white">Order Total</span>
            <span className="font-mono font-extrabold text-white">₹{fin.totalAmount}</span>
          </div>

          {/* Payment Method Split Info */}
          <div className="p-2 rounded-lg bg-white/[0.04] border border-white/10 space-y-1 text-[11px]">
            <div className="flex items-center justify-between">
              <span className="text-white/60">Amount Paid / Payable via Gateway/UPI:</span>
              <span className="font-mono font-bold text-cyan-300 text-xs">
                {fin.paidAmount > 0 ? `₹${fin.paidAmount}` : '₹0 (100% Wallet)'}
              </span>
            </div>
            {fin.walletAmount > 0 && fin.paidAmount > 0 && (
              <p className="text-[10px] text-white/50">
                Split: ₹{fin.walletAmount} from wallet + ₹{fin.paidAmount} via {fin.paymentMethod?.toUpperCase()}
              </p>
            )}
          </div>

          {/* Lister Earnings Breakdown */}
          {isLister && (
            <div className="p-2.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 space-y-1">
              <div className="flex items-center justify-between text-xs font-bold text-emerald-300">
                <span>Your Host Net Earnings:</span>
                <span className="font-mono text-sm">₹{fin.hostEarnings}</span>
              </div>
              <p className="text-[10px] text-white/60">
                Base rental ₹{fin.subtotal}{fin.platformFee > 0 ? ` − platform fee ₹${fin.platformFee}` : ' (0% fee)'}.
                {fin.deposit > 0 ? ` Deposit ₹${fin.deposit} held in escrow for safe return.` : ''}
              </p>
            </div>
          )}

          {/* Admin Commission & Net Summary */}
          {isAdmin && (
            <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/25 space-y-1 text-[10px]">
              <div className="flex items-center justify-between text-cyan-300 font-bold">
                <span>Platform Payout Split:</span>
                <span>Host: ₹{fin.hostEarnings} · Admin Fee: ₹{fin.platformFee}</span>
              </div>
              {fin.deliveryFee > 0 && (
                <div className="flex items-center justify-between text-white/60">
                  <span>Delivery Allocation:</span>
                  <span>₹{fin.deliveryFee} (Courier Logistics)</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
