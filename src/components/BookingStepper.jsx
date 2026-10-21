import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Check, ShieldCheck, FileSignature, KeyRound, CalendarPlus,
  Copy, MessageCircle, X, CheckCircle2, AlertTriangle
} from 'lucide-react'
import { getHandoverPin, getReturnPin } from '../lib/messages'
import { verifySinglePinHandover } from '../lib/trackingService'
import {
  buildWhatsAppLink,
  formatHandoverActiveMessage,
  formatAgreementSignReminderMessage
} from '../lib/whatsappSmsService'

const STEPS = [
  { id: 'requested', label: 'Requested', num: 1 },
  { id: 'confirmed', label: 'Confirmed', num: 2 },
  { id: 'active', label: 'Handed Over', num: 3 },
  { id: 'returned', label: 'Returned', num: 4 },
  { id: 'refunded', label: 'Refunded', num: 5 },
]

export default function BookingStepper({
  booking,
  role = 'renter',
  partyPhone = '',
  partyName = '',
  onAction,
  onOpenInspection,
  onOpenRefund,
  onOpenSignature,
  onExtendRental,
}) {
  const status = booking.status || 'pending'
  const isCancelled = status === 'cancelled'
  const deposit = Number(booking.deposit || 0)
  const depositSettled = ['refunded', 'partially_refunded', 'forfeited'].includes(booking.deposit_status) || deposit === 0

  // Calculate current active step index (0 to 4)
  let activeStep = 0
  if (status === 'confirmed') activeStep = 1
  else if (status === 'active') activeStep = 2
  else if (status === 'completed') {
    activeStep = depositSettled ? 4 : 3
  }

  const isLister = role === 'lister'
  const isRenter = role === 'renter'

  const mySignature = isRenter ? booking.renter_signature : booking.lister_signature
  const otherSignature = isRenter ? booking.lister_signature : booking.renter_signature
  const bothSigned = Boolean(booking.renter_signature && booking.lister_signature)
  const handoverPin = getHandoverPin(booking.id)
  const returnPin = getReturnPin(booking.id)

  const [copiedPin, setCopiedPin] = useState(false)
  const [verifyMode, setVerifyMode] = useState(null) // 'checkin' | 'checkout' | null
  const [pinInput, setPinInput] = useState('')
  const [pinError, setPinError] = useState('')
  const [verifyingPin, setVerifyingPin] = useState(false)
  const [checklist, setChecklist] = useState({
    cables: true,
    controllers: true,
    condition: true,
  })

  const currentPin = activeStep === 1 ? handoverPin : returnPin

  const handleCopyPin = () => {
    navigator.clipboard?.writeText(currentPin)
    setCopiedPin(true)
    setTimeout(() => setCopiedPin(false), 2000)
  }

  const handleSharePinWhatsApp = () => {
    const label = activeStep === 1 ? 'Handover OTP PIN' : 'Return OTP PIN'
    const gearTitle = booking.listings?.title || 'Gear'
    const shortId = String(booking.id || '').slice(0, 8).toUpperCase()
    const msg = `🔐 *LocalDen ${label}* for *${gearTitle}* (#${shortId}): *${currentPin}*\n\nDates: ${booking.start_date} → ${booking.end_date}`
    window.open(buildWhatsAppLink(partyPhone, msg), '_blank', 'noopener,noreferrer')
  }

  const handleNudgeSignatureWhatsApp = () => {
    const msg = formatAgreementSignReminderMessage({
      booking,
      recipientName: partyName || (isRenter ? 'Host' : 'Renter'),
      senderName: isRenter ? (booking.renter?.full_name || 'Borrower') : (booking.lister?.full_name || 'Host'),
      handoverPin,
    })
    window.open(buildWhatsAppLink(partyPhone, msg), '_blank', 'noopener,noreferrer')
  }

  const openVerifyDrawer = (phase) => {
    setVerifyMode(phase)
    setPinInput('')
    setPinError('')
    setChecklist({ cables: true, controllers: true, condition: true })
  }

  const handleConfirmPinVerification = async (bypass = false, sendWhatsApp = false) => {
    setPinError('')
    const isReturn = verifyMode === 'checkout'
    const expected = isReturn ? returnPin : handoverPin
    const codeToUse = bypass ? expected : pinInput.trim()

    if (!bypass && codeToUse.length < 4) {
      setPinError(`Please enter the 4-digit ${isReturn ? 'Return' : 'Handover'} PIN shown on the renter's pass.`)
      return
    }

    setVerifyingPin(true)
    try {
      const res = await verifySinglePinHandover({
        bookingId: booking.id,
        inputPin: codeToUse,
        phase: verifyMode,
        checklist,
        bypassPin: bypass,
      })
      if (!res.success) {
        setPinError(res.message)
        setVerifyingPin(false)
        return
      }

      setVerifyMode(null)
      onAction(isReturn ? 'completed' : 'active')

      if (sendWhatsApp && partyPhone) {
        if (!isReturn) {
          const msg = formatHandoverActiveMessage({
            booking,
            handoverPin,
            returnPin,
            recipientRole: 'renter',
          })
          window.open(buildWhatsAppLink(partyPhone, msg), '_blank', 'noopener,noreferrer')
        } else {
          const shortId = String(booking.id || '').slice(0, 8).toUpperCase()
          const msg = `📦 *RETURN VERIFIED (#${shortId})*\n\nThank you for returning *${booking.listings?.title || 'the gear'}* in good condition!${deposit > 0 ? ` Your ₹${deposit} security deposit is now queued for settlement.` : ''} Hope you had an awesome session! ⚡`
          window.open(buildWhatsAppLink(partyPhone, msg), '_blank', 'noopener,noreferrer')
        }
      }
    } catch (err) {
      setPinError(err.message || 'Could not verify PIN.')
    } finally {
      setVerifyingPin(false)
    }
  }

  return (
    <div className="booking-stepper rounded-2xl bg-black/40 border border-white/10 p-4 my-3 text-xs">
      {/* 5-Step Visual Progress Bar */}
      <div className="relative flex items-center justify-between mb-4 px-2">
        {/* Connecting progress line */}
        <div className="absolute left-6 right-6 top-1/2 -translate-y-1/2 h-0.5 bg-white/10 -z-0">
          <div
            className={`h-full transition-all duration-500 ${
              isCancelled ? 'bg-red-500/50' : 'bg-gradient-to-r from-cyan-500 to-emerald-400'
            }`}
            style={{
              width: isCancelled ? '100%' : `${(activeStep / (STEPS.length - 1)) * 100}%`,
            }}
          />
        </div>

        {STEPS.map((step, idx) => {
          const isDone = !isCancelled && idx < activeStep
          const isCurrent = !isCancelled && idx === activeStep

          let circleClass = 'bg-white/10 text-white/40 border-white/20'
          if (isDone) {
            circleClass = 'bg-emerald-500 border-emerald-400 text-black shadow-lg shadow-emerald-500/20'
          } else if (isCurrent) {
            circleClass = 'bg-cyan-500 border-cyan-300 text-black shadow-lg shadow-cyan-500/30 ring-4 ring-cyan-500/20 animate-pulse'
          } else if (isCancelled) {
            circleClass = 'bg-red-500/20 border-red-500/40 text-red-300'
          }

          return (
            <div key={step.id} className="relative z-10 flex flex-col items-center">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs border transition-all ${circleClass}`}
              >
                {isDone ? <Check size={14} strokeWidth={3} /> : step.num}
              </div>
              <span
                className={`mt-1.5 text-[11px] font-display whitespace-nowrap transition-colors ${
                  isCurrent ? 'text-cyan-300 font-bold' : isDone ? 'text-white/80' : 'text-white/40'
                }`}
              >
                {step.label}
              </span>
            </div>
          )
        })}
      </div>

      {/* Live 4-Digit Handover / Return OTP Bar (shown on Confirmed or Active steps) */}
      {!isCancelled && (activeStep === 1 || activeStep === 2) && (
        <div className="mb-3 p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <KeyRound size={15} className="text-cyan-400 shrink-0" />
            <div>
              <span className="text-[10px] uppercase tracking-wider font-bold text-cyan-300 block">
                {activeStep === 1 ? '🔐 Handover Verification PIN' : '🔐 Return Verification PIN'}
              </span>
              <span className="text-[11px] text-white/60">
                {activeStep === 1
                  ? isRenter
                    ? 'Share this 4-digit OTP with the host/rider after inspecting the gear'
                    : 'Verify this 4-digit OTP with the renter before handing over gear'
                  : isRenter
                    ? 'Match this 4-digit OTP when returning gear to unlock instant deposit release'
                    : 'Verify this 4-digit OTP with the renter upon gear return'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 ml-auto">
            <div className="px-3 py-1 rounded-lg bg-black/60 border border-cyan-400/40 font-mono text-sm font-extrabold tracking-[0.22em] text-cyan-300">
              {currentPin}
            </div>
            <button
              type="button"
              onClick={handleCopyPin}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-cyan-200 border border-white/15 transition-all"
              title="Copy 4-digit PIN"
            >
              {copiedPin ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
            </button>
            {partyPhone && (
              <button
                type="button"
                onClick={handleSharePinWhatsApp}
                className="px-2 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/35 text-[11px] font-bold flex items-center gap-1 transition-all"
                title="Share PIN on WhatsApp"
              >
                <MessageCircle size={12} /> Share PIN
              </button>
            )}
          </div>
        </div>
      )}

      {/* Interactive Handover / Return Verification Drawer for Host */}
      {verifyMode && isLister && (
        <div className="mb-3 p-3.5 rounded-xl bg-slate-950/90 border border-emerald-500/40 space-y-3 animate-fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck size={16} className="text-emerald-400" />
              <strong className="text-white font-display text-xs">
                {verifyMode === 'checkin'
                  ? 'Verify Handover PIN & Hardware Checklist'
                  : 'Verify Return PIN & Check-Out Condition'}
              </strong>
            </div>
            <button
              type="button"
              onClick={() => setVerifyMode(null)}
              className="p-1 rounded-lg text-white/50 hover:text-white hover:bg-white/10"
            >
              <X size={14} />
            </button>
          </div>

          {pinError && (
            <div className="p-2 rounded-lg bg-red-500/15 border border-red-500/35 text-red-300 text-[11px] flex items-center gap-1.5">
              <AlertTriangle size={13} className="shrink-0" />
              <span>{pinError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* PIN Input */}
            <div className="p-2.5 rounded-xl bg-black/50 border border-white/10 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-cyan-300">
                  Enter Renter {verifyMode === 'checkin' ? 'Handover' : 'Return'} PIN
                </span>
                <button
                  type="button"
                  onClick={() => setPinInput(verifyMode === 'checkin' ? handoverPin : returnPin)}
                  className="text-[10px] text-cyan-400 hover:underline font-semibold"
                >
                  Auto-fill ({verifyMode === 'checkin' ? handoverPin : returnPin})
                </button>
              </div>
              <input
                type="text"
                maxLength={4}
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
                placeholder="• • • •"
                className="input-dark w-full text-center font-mono text-lg font-extrabold tracking-[0.3em] py-1.5 text-cyan-300"
              />
            </div>

            {/* 3-Point Hardware Checklist */}
            <div className="p-2.5 rounded-xl bg-black/50 border border-white/10 space-y-1.5">
              <span className="text-[10px] uppercase font-bold text-emerald-300 block">
                3-Point Hardware Checklist
              </span>
              {[
                { key: 'cables', label: 'Power cord & HDMI/AV cables verified' },
                { key: 'controllers', label: 'Controllers / accessories tested & counted' },
                { key: 'condition', label: 'Physical condition matches inspection photos' },
              ].map((item) => (
                <label key={item.key} className="flex items-center gap-2 text-[11px] text-white/80 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checklist[item.key]}
                    onChange={(e) => setChecklist((prev) => ({ ...prev, [item.key]: e.target.checked }))}
                    className="rounded accent-emerald-400"
                  />
                  <span>{item.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 flex-wrap pt-1">
            <button
              type="button"
              disabled={verifyingPin}
              onClick={() => handleConfirmPinVerification(false, false)}
              className="px-3.5 py-2 rounded-xl bg-emerald-500 text-black font-bold text-xs hover:bg-emerald-400 transition-all flex items-center gap-1"
            >
              <CheckCircle2 size={13} />
              {verifyingPin ? 'Verifying...' : verifyMode === 'checkin' ? 'Verify & Mark Handed Over' : 'Verify & Mark Returned'}
            </button>
            {partyPhone && (
              <button
                type="button"
                disabled={verifyingPin}
                onClick={() => handleConfirmPinVerification(false, true)}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-black font-extrabold text-xs hover:brightness-110 transition-all flex items-center gap-1 shadow-md shadow-emerald-500/20"
              >
                <MessageCircle size={13} />
                {verifyMode === 'checkin' ? 'Verify + WhatsApp Active Pass' : 'Verify + WhatsApp Receipt'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Clear Next Action Banner */}
      <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-between gap-3 flex-wrap">
        <div className="space-y-0.5 min-w-[200px]">
          <span className="text-[10px] uppercase font-bold tracking-wider text-cyan-400 block">
            Next Action Required
          </span>

          {isCancelled ? (
            <div className="text-red-400 font-bold">
              ✕ Booking cancelled. No further actions needed.
            </div>
          ) : activeStep === 0 ? (
            /* Step 1: Requested */
            <div>
              <p className="text-white font-medium">
                {isLister ? 'Review & confirm booking request' : 'Awaiting host acceptance'}
              </p>
              <p className="text-[11px] text-white/50">
                {isLister
                  ? 'Confirm gear availability and schedule.'
                  : 'You can e-sign the Digital Rental Pact now to speed up handover.'}
              </p>
            </div>
          ) : activeStep === 1 ? (
            /* Step 2: Confirmed */
            <div>
              <p className="text-white font-medium">
                {!bothSigned && !mySignature
                  ? 'Sign agreement & prepare for pickup'
                  : isLister
                    ? `Verify PIN (${handoverPin}), hand over gear & take check-in photos`
                    : `Show PIN (${handoverPin}), inspect gear & take check-in photos`}
              </p>
              <p className="text-[11px] text-white/50">
                {!bothSigned && !mySignature
                  ? 'E-sign the digital pact before gear handover.'
                  : 'Add pickup photos to document initial condition.'}
              </p>
            </div>
          ) : activeStep === 2 ? (
            /* Step 3: Active / Handed Over */
            <div>
              <p className="text-white font-medium">
                {isLister ? 'Awaiting return on completion' : 'Gear in use · Enjoy your session!'}
              </p>
              <p className="text-[11px] text-white/50">
                {isRenter
                  ? 'Want to keep playing? Extend by +1 day in 1 tap or add check-out photos on return.'
                  : 'Take check-out photos on return to settle security deposit.'}
              </p>
            </div>
          ) : activeStep === 3 ? (
            /* Step 4: Returned, waiting for deposit settlement */
            <div>
              <p className="text-white font-medium">
                {isLister ? 'Release security deposit refund' : 'Host reviewing deposit refund'}
              </p>
              <p className="text-[11px] text-white/50">
                {isLister
                  ? `₹${deposit.toLocaleString('en-IN')} deposit held. Review return condition to finalize.`
                  : `₹${deposit.toLocaleString('en-IN')} deposit will be released within 48h.`}
              </p>
            </div>
          ) : (
            /* Step 5: Refunded / Completed */
            <div>
              <p className="text-emerald-400 font-medium">
                ✓ Rental finalized & deposit settled
              </p>
              <p className="text-[11px] text-white/50">
                Everything is completed. Don’t forget to leave a review!
              </p>
            </div>
          )}
        </div>

        {/* Primary Call to Action Buttons */}
        {!isCancelled && (
          <div className="flex items-center gap-2 flex-wrap ml-auto">
            {/* Sign Agreement Quick Status / CTA — available at all non-cancelled steps */}
            {bothSigned ? (
              <span className="px-2.5 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-semibold flex items-center gap-1">
                ✓ Pact Signed by Both
              </span>
            ) : !mySignature ? (
              <button
                type="button"
                onClick={onOpenSignature}
                className="px-3 py-1.5 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/40 text-xs font-bold hover:bg-purple-500/30 transition-all flex items-center gap-1"
              >
                <FileSignature size={13} /> E-Sign Pact
              </button>
            ) : (
              <div className="flex items-center gap-1.5">
                <span className="px-2.5 py-1 rounded-xl bg-purple-500/15 text-purple-300 border border-purple-500/25 text-[11px] font-semibold flex items-center gap-1">
                  ✍️ Signed (Awaiting {isRenter ? 'Host' : 'Borrower'})
                </span>
                {partyPhone && !otherSignature && (
                  <button
                    type="button"
                    onClick={handleNudgeSignatureWhatsApp}
                    className="px-2 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold flex items-center gap-1 transition-all"
                    title="Send WhatsApp reminder to sign the Rental Pact"
                  >
                    <MessageCircle size={11} /> Nudge on WA
                  </button>
                )}
              </div>
            )}

            {/* 1-Tap Extend Rental (+1 Day) for Renter on Confirmed or Active Bookings */}
            {isRenter && (activeStep === 1 || activeStep === 2) && onExtendRental && (
              <button
                type="button"
                onClick={() => onExtendRental(booking)}
                className="px-3 py-1.5 rounded-xl bg-amber-400/15 text-amber-300 border border-amber-400/40 text-xs font-bold hover:bg-amber-400/25 transition-all flex items-center gap-1"
                title="Extend your rental by 1 extra day"
              >
                <CalendarPlus size={13} /> +1 Day Extend
              </button>
            )}

            {/* Step 0: Requested */}
            {activeStep === 0 && isLister && (
              <>
                <button
                  type="button"
                  onClick={() => onAction('confirmed')}
                  className="px-4 py-2 rounded-xl bg-emerald-500 text-black font-bold text-xs hover:bg-emerald-400 transition-all shadow-md shadow-emerald-500/20"
                >
                  ✓ Confirm Request
                </button>
                <button
                  type="button"
                  onClick={() => onAction('cancelled')}
                  className="px-3 py-2 rounded-xl bg-red-500/10 text-red-300 border border-red-500/30 font-semibold text-xs hover:bg-red-500/20 transition-all"
                >
                  Decline
                </button>
              </>
            )}
            {activeStep === 0 && isRenter && (
              <button
                type="button"
                onClick={() => onAction('cancelled')}
                className="px-3 py-2 rounded-xl bg-red-500/10 text-red-300 border border-red-500/30 font-semibold text-xs hover:bg-red-500/20 transition-all"
              >
                Cancel Request
              </button>
            )}

            {/* Step 1: Confirmed */}
            {activeStep === 1 && isLister && (
              <button
                type="button"
                onClick={() => openVerifyDrawer('checkin')}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-black font-bold text-xs hover:brightness-110 transition-all shadow-md shadow-cyan-500/20"
              >
                🚚 Verify PIN ({handoverPin}) &amp; Hand Over
              </button>
            )}
            {activeStep === 1 && isRenter && (
              <button
                type="button"
                onClick={() => onOpenInspection('checkin')}
                className="px-4 py-2 rounded-xl bg-cyan-500 text-black font-bold text-xs hover:bg-cyan-400 transition-all"
              >
                📸 Add Check-in Photos
              </button>
            )}

            {/* Step 2: Active / Handed over */}
            {activeStep === 2 && isLister && (
              <button
                type="button"
                onClick={() => openVerifyDrawer('checkout')}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-400 text-black font-bold text-xs hover:brightness-110 transition-all shadow-md shadow-emerald-500/20"
              >
                📦 Verify Return ({returnPin}) &amp; Complete
              </button>
            )}
            {activeStep === 2 && isRenter && (
              <button
                type="button"
                onClick={() => onOpenInspection('checkout')}
                className="px-4 py-2 rounded-xl bg-cyan-500 text-black font-bold text-xs hover:bg-cyan-400 transition-all"
              >
                📸 Add Check-out Photos
              </button>
            )}

            {/* Step 3: Returned, awaiting refund */}
            {activeStep === 3 && isLister && (
              <button
                type="button"
                onClick={onOpenRefund}
                className="px-4 py-2 rounded-xl bg-emerald-500 text-black font-bold text-xs hover:bg-emerald-400 transition-all shadow-md shadow-emerald-500/20"
              >
                💰 Process Deposit Refund
              </button>
            )}

            {/* Step 3 & 4: Returned / Settled — allow review immediately on completion */}
            {activeStep >= 3 && isRenter && (
              <Link
                to={`/review/${booking.id}`}
                className="px-4 py-2 rounded-xl bg-amber-400 text-black font-bold text-xs hover:bg-amber-300 transition-all shadow-md shadow-amber-400/20"
              >
                ⭐ Leave a Review
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  )
}


