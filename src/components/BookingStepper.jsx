import { Check, Clock, ShieldCheck, ChevronRight, AlertCircle, Sparkles, FileSignature } from 'lucide-react'

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
  onAction,
  onOpenInspection,
  onOpenRefund,
  onOpenSignature,
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
  const bothSigned = Boolean(booking.renter_signature && booking.lister_signature)

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
          const isPending = !isCancelled && idx > activeStep

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
                  : 'The host has been notified and will confirm shortly.'}
              </p>
            </div>
          ) : activeStep === 1 ? (
            /* Step 2: Confirmed */
            <div>
              <p className="text-white font-medium">
                {!bothSigned && !mySignature
                  ? 'Sign agreement & prepare for pickup'
                  : isLister
                    ? 'Hand over gear & take check-in photos'
                    : 'Inspect gear & take check-in photos'}
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
                {isLister ? 'Awaiting return on completion' : 'Gear in use · Return by end date'}
              </p>
              <p className="text-[11px] text-white/50">
                Take check-out photos on return to settle security deposit.
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
            {/* Sign Agreement Quick Status / CTA */}
            {activeStep >= 1 && (
              bothSigned ? (
                <span className="px-2.5 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-semibold flex items-center gap-1">
                  ✓ Signed by both
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
                <span className="px-2.5 py-1 rounded-xl bg-purple-500/15 text-purple-300 border border-purple-500/25 text-[11px] font-semibold flex items-center gap-1">
                  ✍️ Signed by you (Awaiting {isRenter ? 'Host' : 'Borrower'})
                </span>
              )
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
                onClick={() => onAction('active')}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-black font-bold text-xs hover:brightness-110 transition-all shadow-md shadow-cyan-500/20"
              >
                🚚 Hand Over Gear
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
                onClick={() => onAction('completed')}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-400 text-black font-bold text-xs hover:brightness-110 transition-all shadow-md shadow-emerald-500/20"
              >
                📦 Mark Returned
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

            {/* Step 4: Fully Settled */}
            {activeStep >= 4 && isRenter && (
              <a
                href={`/review/${booking.id}`}
                className="px-4 py-2 rounded-xl bg-amber-400 text-black font-bold text-xs hover:bg-amber-300 transition-all shadow-md shadow-amber-400/20"
              >
                ⭐ Leave a Review
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
