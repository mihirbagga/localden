import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, CheckCircle2, AlertTriangle, ShieldCheck, Camera, Send, ExternalLink } from 'lucide-react'
import { useToast } from '../contexts/ToastContext'
import { supabase } from '../lib/supabase'
import { fetchInspections, phaseInspections } from '../lib/inspections'
import { bookingWhatsAppLink } from '../lib/alerts'

const PRESET_REASONS = [
  'Minor cosmetic wear / scratch',
  'Missing cable / accessory',
  'Late return delay',
  'Cleaning fee needed',
  'Heavy damage during rental',
]

export default function DepositRefundModal({ booking, onClose, onRefundSuccess }) {
  const { showToast } = useToast()
  const totalDeposit = Number(booking?.deposit || 0)

  const [mode, setMode] = useState('full') // 'full' | 'partial' | 'forfeit'
  const [deductionAmount, setDeductionAmount] = useState(0)
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [inspections, setInspections] = useState([])
  const [loadingPhotos, setLoadingPhotos] = useState(true)
  const [zoomPhoto, setZoomPhoto] = useState('')

  useEffect(() => {
    let cancelled = false
    fetchInspections(booking.id)
      .then((rows) => {
        if (!cancelled) {
          setInspections(rows || [])
          setLoadingPhotos(false)
        }
      })
      .catch(() => {
        if (!cancelled) setLoadingPhotos(false)
      })
    return () => { cancelled = true }
  }, [booking.id])

  const checkinRows = phaseInspections(inspections, 'checkin')
  const checkoutRows = phaseInspections(inspections, 'checkout')
  const checkinPhotos = checkinRows.flatMap((r) => r.photos || [])
  const checkoutPhotos = checkoutRows.flatMap((r) => r.photos || [])

  const refundAmount = mode === 'full'
    ? totalDeposit
    : mode === 'forfeit'
      ? 0
      : Math.max(0, totalDeposit - Number(deductionAmount || 0))

  const effectiveDeduction = mode === 'full'
    ? 0
    : mode === 'forfeit'
      ? totalDeposit
      : Number(deductionAmount || 0)

  const handleModeChange = (nextMode) => {
    setMode(nextMode)
    if (nextMode === 'full') {
      setDeductionAmount(0)
    } else if (nextMode === 'forfeit') {
      setDeductionAmount(totalDeposit)
      if (!reason) setReason('Full security deposit forfeited due to gear damage/loss.')
    } else if (nextMode === 'partial') {
      if (deductionAmount === 0 || deductionAmount === totalDeposit) {
        setDeductionAmount(Math.round(totalDeposit * 0.25) || 100)
      }
    }
  }

  const handleConfirm = async () => {
    if (mode !== 'full' && !reason.trim()) {
      showToast('Please specify a reason for withholding deposit amount.', 'error')
      return
    }

    if (effectiveDeduction < 0 || refundAmount < 0) {
      showToast('Invalid refund amount.', 'error')
      return
    }

    setLoading(true)
    try {
      const { data, error } = await supabase.rpc('process_deposit_refund', {
        p_booking_id: booking.id,
        p_refund_amount: refundAmount,
        p_deduction_amount: effectiveDeduction,
        p_reason: reason.trim() || 'Full refund released in good condition',
      })

      if (error) {
        if (/does not exist/i.test(error.message || '')) {
          // Direct fallback
          const depositStatus = effectiveDeduction === 0 ? 'refunded' : (refundAmount === 0 ? 'forfeited' : 'partially_refunded')
          const { error: updErr } = await supabase
            .from('bookings')
            .update({
              deposit_status: depositStatus,
              deposit_refunded_amount: refundAmount,
              deposit_deduction_amount: effectiveDeduction,
              deposit_deduction_reason: reason.trim() || 'Full refund released in good condition',
              deposit_refunded_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', booking.id)
          if (updErr) throw updErr
        } else {
          throw error
        }
      }

      showToast(`Deposit settled: ₹${refundAmount} refunded!`, 'success')
      onRefundSuccess?.({
        deposit_status: effectiveDeduction === 0 ? 'refunded' : (refundAmount === 0 ? 'forfeited' : 'partially_refunded'),
        deposit_refunded_amount: refundAmount,
        deposit_deduction_amount: effectiveDeduction,
        deposit_deduction_reason: reason.trim(),
      })
      onClose()
    } catch (err) {
      showToast(err.message || 'Failed to process deposit refund', 'error')
    } finally {
      setLoading(false)
    }
  }

  const renterName = booking.renter?.full_name || 'Borrower'
  const renterPhone = booking.renter?.phone || ''
  const waReceipt = renterPhone
    ? bookingWhatsAppLink('deposit_refund', booking, renterPhone, {
      refundAmount,
      deductionAmount: effectiveDeduction,
      reason: reason.trim(),
    })
    : ''

  return createPortal(
    <div className="dash-modal-bg" onClick={onClose} role="presentation">
      <div
        className="dash-modal max-w-xl w-full p-6 text-left"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="deposit-modal-title"
      >
        <button
          type="button"
          className="dash-modal__x"
          onClick={onClose}
          aria-label="Close deposit refund modal"
        >
          <X size={16} />
        </button>

        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-base">
            💰
          </div>
          <div>
            <h2 id="deposit-modal-title" className="text-lg font-bungee text-white">
              Process Security Deposit Refund
            </h2>
            <p className="text-xs text-white/60">
              {booking.listings?.title || 'Rental Item'} · Borrower: <strong className="text-white">{renterName}</strong>
            </p>
          </div>
        </div>

        {/* Deposit Summary Banner */}
        <div className="grid grid-cols-3 gap-2 my-4 p-3 rounded-2xl bg-black/40 border border-white/10 text-center">
          <div>
            <span className="text-[10px] uppercase font-bold text-white/50 block">Held Deposit</span>
            <span className="text-base font-bold text-white">₹{totalDeposit.toLocaleString('en-IN')}</span>
          </div>
          <div className="border-x border-white/10">
            <span className="text-[10px] uppercase font-bold text-emerald-400/80 block">Refund to Borrower</span>
            <span className="text-base font-bold text-emerald-400">₹{refundAmount.toLocaleString('en-IN')}</span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-amber-400/80 block">Amount Deducted</span>
            <span className="text-base font-bold text-amber-400">₹{effectiveDeduction.toLocaleString('en-IN')}</span>
          </div>
        </div>

        {/* Action Type Selector */}
        <div className="space-y-1 mb-4">
          <label className="text-xs font-semibold text-white/80 block">Refund Decision</label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              className={`p-2.5 rounded-xl text-xs font-bold border transition-all text-center ${
                mode === 'full'
                  ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                  : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
              }`}
              onClick={() => handleModeChange('full')}
            >
              ✓ Full Refund
              <span className="block text-[10px] font-normal text-white/60 mt-0.5">Return 100%</span>
            </button>
            <button
              type="button"
              className={`p-2.5 rounded-xl text-xs font-bold border transition-all text-center ${
                mode === 'partial'
                  ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                  : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
              }`}
              onClick={() => handleModeChange('partial')}
            >
              ⚠️ Deduct Damage
              <span className="block text-[10px] font-normal text-white/60 mt-0.5">Hold partial</span>
            </button>
            <button
              type="button"
              className={`p-2.5 rounded-xl text-xs font-bold border transition-all text-center ${
                mode === 'forfeit'
                  ? 'bg-red-500/20 border-red-500 text-red-300'
                  : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
              }`}
              onClick={() => handleModeChange('forfeit')}
            >
              ✕ Forfeit Deposit
              <span className="block text-[10px] font-normal text-white/60 mt-0.5">Full loss</span>
            </button>
          </div>
        </div>

        {/* Partial Amount Input */}
        {mode === 'partial' && (
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 mb-4 space-y-2">
            <label className="text-xs font-semibold text-amber-300 flex items-center justify-between">
              <span>Deduction Amount (₹)</span>
              <span className="text-[11px] font-normal text-amber-300/80">Max: ₹{totalDeposit}</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/60 font-bold">₹</span>
              <input
                type="number"
                min="1"
                max={totalDeposit}
                value={deductionAmount}
                onChange={(e) => {
                  const val = Math.min(totalDeposit, Math.max(0, Number(e.target.value) || 0))
                  setDeductionAmount(val)
                }}
                className="input-dark pl-7 w-full py-2 text-sm"
                placeholder="Enter deduction amount"
              />
            </div>
          </div>
        )}

        {/* Reason Field & Chips (if deduction > 0) */}
        {mode !== 'full' && (
          <div className="space-y-2 mb-4">
            <label className="text-xs font-semibold text-white/80 flex items-center justify-between">
              <span>Reason for Deduction (visible to borrower)</span>
              <span className="text-[10px] text-amber-400">Required</span>
            </label>
            <div className="flex flex-wrap gap-1.5 mb-1.5">
              {PRESET_REASONS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setReason(p)}
                  className="px-2 py-0.5 rounded-lg text-[10px] bg-white/5 hover:bg-white/15 text-white/70 border border-white/10 transition-colors"
                >
                  + {p}
                </button>
              ))}
            </div>
            <textarea
              className="input-dark w-full text-xs h-16"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain the damage or reason for deduction (e.g. scratch on lens, missing HDMI cable)..."
            />
          </div>
        )}

        {/* Inspection Photos Comparison Link & Previews */}
        <div className="mb-4 p-3 rounded-xl bg-white/[0.03] border border-white/10 text-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-white/80 flex items-center gap-1.5">
              <Camera size={14} className="text-cyan-400" /> Inspection Photo Evidence
            </span>
            <span className="text-[10px] text-white/40">
              {checkinPhotos.length} check-in · {checkoutPhotos.length} check-out
            </span>
          </div>

          {loadingPhotos ? (
            <p className="text-[11px] text-white/40 italic">Loading inspection photos…</p>
          ) : checkinPhotos.length === 0 && checkoutPhotos.length === 0 ? (
            <p className="text-[11px] text-white/40 italic">No check-in or check-out photos recorded for this booking.</p>
          ) : (
            <div className="grid grid-cols-2 gap-2 mt-1">
              <div>
                <span className="text-[10px] text-white/50 block mb-1">Pickup (Check-in):</span>
                <div className="flex gap-1.5 overflow-x-auto pb-1">
                  {checkinPhotos.length ? checkinPhotos.map((src, i) => (
                    <img
                      key={i}
                      src={src}
                      alt="Checkin"
                      className="w-14 h-14 object-cover rounded-lg border border-white/10 cursor-pointer hover:border-cyan-400 transition-all flex-shrink-0"
                      onClick={() => setZoomPhoto(src)}
                    />
                  )) : (
                    <span className="text-[10px] text-white/30">None</span>
                  )}
                </div>
              </div>
              <div>
                <span className="text-[10px] text-white/50 block mb-1">Return (Check-out):</span>
                <div className="flex gap-1.5 overflow-x-auto pb-1">
                  {checkoutPhotos.length ? checkoutPhotos.map((src, i) => (
                    <img
                      key={i}
                      src={src}
                      alt="Checkout"
                      className="w-14 h-14 object-cover rounded-lg border border-white/10 cursor-pointer hover:border-amber-400 transition-all flex-shrink-0"
                      onClick={() => setZoomPhoto(src)}
                    />
                  )) : (
                    <span className="text-[10px] text-white/30">None</span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/10">
          {waReceipt ? (
            <a
              href={waReceipt}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-emerald-400 hover:underline flex items-center gap-1 font-semibold"
            >
              📲 Notify on WhatsApp
            </a>
          ) : <div />}

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="btn-outline text-xs px-3 py-2"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn-primary text-xs px-4 py-2"
              onClick={handleConfirm}
              disabled={loading}
            >
              {loading ? 'Processing…' : `Confirm Settlement (₹${refundAmount} Refund)`}
            </button>
          </div>
        </div>

        {/* Lightbox photo zoom */}
        {zoomPhoto && createPortal(
          <div
            className="dash-modal-bg z-[9999]"
            onClick={() => setZoomPhoto('')}
            role="presentation"
          >
            <img
              src={zoomPhoto}
              alt="Inspection enlarged"
              className="max-h-[85vh] max-w-[90vw] rounded-2xl shadow-2xl border border-white/20 object-contain"
            />
          </div>,
          document.body
        )}
      </div>
    </div>,
    document.body
  )
}
