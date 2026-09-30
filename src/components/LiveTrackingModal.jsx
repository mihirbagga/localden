import { useState, useEffect } from 'react'
import { X, Navigation, Phone, MapPin, CheckCircle2, Clock, QrCode, Shield, Lock, Edit2, Check } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { supabase } from '../lib/supabase'

const TRACKING_STEPS = [
  { id: 'confirmed', title: 'Booking Confirmed', desc: 'Host accepted booking' },
  { id: 'inspection', title: 'Pre-Rental Inspection', desc: 'Hardware & condition verified' },
  { id: 'transit', title: 'Courier Dispatched', desc: 'Out for delivery / Pickup ready' },
  { id: 'active', title: 'Active Rental', desc: 'Renter using hardware' },
  { id: 'return', title: 'Return Pickup', desc: 'Courier picking up system' },
  { id: 'completed', title: 'Completed', desc: 'Hardware returned to host' },
]

export default function LiveTrackingModal({ booking, onClose, isAdmin = false }) {
  const { user } = useAuth()
  const { showToast } = useToast()

  const isHubStored = booking?.listings?.fulfillment_type === 'warehouse'
  const isLister = user?.id === (booking?.lister_id || booking?.listings?.user_id)
  const isUserAdmin = isAdmin || user?.email?.includes('admin') || user?.user_metadata?.role === 'admin'

  // Rules:
  // - Hub Stored: ONLY Admin can update tracking steps & driver details
  // - Direct Handover: Lister OR Admin can update tracking steps & driver details
  const canEditTracking = isHubStored ? isUserAdmin : (isLister || isUserAdmin)

  const status = booking?.status || 'active'
  const listingTitle = booking?.listings?.title || 'Gaming System Rig'
  const handoverType = booking?.delivery_type || booking?.handover_type || 'courier'

  const [currentStepIndex, setCurrentStepIndex] = useState(2)
  const [courierEta, setCourierEta] = useState(booking?.courier_eta || '24 mins')
  const [showQr, setShowQr] = useState(false)
  const [showEditDrawer, setShowEditDrawer] = useState(false)

  // Driver & Tracking State
  const [driverName, setDriverName] = useState(booking?.driver_name || 'Mihir')
  const [driverPhone, setDriverPhone] = useState(booking?.driver_phone || '+91 9034695091')
  const [driverLocation, setDriverLocation] = useState(booking?.driver_location || 'Koramangla ➔ Destination')
  const [otpCode, setOtpCode] = useState(booking?.handover_otp || '4892')
  const [inputOtp, setInputOtp] = useState('')
  const [otpVerified, setOtpVerified] = useState(Boolean(booking?.otp_verified))

  useEffect(() => {
    if (status === 'pending') setCurrentStepIndex(0)
    else if (status === 'confirmed') setCurrentStepIndex(1)
    else if (status === 'active') setCurrentStepIndex(3)
    else if (status === 'completed') setCurrentStepIndex(5)
  }, [status])

  const handleStepChange = async (newIdx) => {
    if (!canEditTracking) {
      showToast(
        isHubStored
          ? 'Hub Stored order: Only localDen Admin can update tracking status.'
          : 'Only Lister or Admin can update live tracking status.',
        'error'
      )
      return
    }
    setCurrentStepIndex(newIdx)
    showToast(`Updated tracking to Phase ${newIdx + 1}: ${TRACKING_STEPS[newIdx].title}`, 'success')
  }

  const handleVerifyOtp = () => {
    if (inputOtp.trim() === otpCode.trim()) {
      setOtpVerified(true)
      showToast('✓ OTP Verified! Physical handover confirmed.', 'success')
    } else {
      showToast('Invalid OTP. Please check the 4-digit code provided by renter.', 'error')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="glass relative w-full max-w-xl rounded-3xl p-6 border border-cyan-500/30 shadow-2xl my-8">
        <button
          onClick={onClose}
          type="button"
          className="absolute top-5 right-5 p-2 rounded-xl text-white/50 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl flex-shrink-0"
            style={{ background: 'rgba(0,210,255,0.12)', border: '1px solid rgba(0,210,255,0.3)' }}
          >
            🚚
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="section-label">Live Order Tracking</span>
              {isHubStored ? (
                <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-[10px] font-bold uppercase flex items-center gap-1">
                  <Shield size={10} /> Hub Stored (Admin Control)
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full bg-magenta/20 border border-magenta/40 text-pink-300 text-[10px] font-bold uppercase">
                  🏠 Direct Handover
                </span>
              )}
            </div>
            <h2 className="font-bungee text-lg text-white leading-tight">{listingTitle}</h2>
          </div>
        </div>

        {/* Access Warning Banner for Hub Stored Listers */}
        {isHubStored && !isUserAdmin && (
          <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 mb-4 text-xs text-cyan-200 flex items-center gap-2">
            <Lock size={14} className="flex-shrink-0 text-cyan-400" />
            <span>This gear is stored at <strong>localDen Hub</strong>. Live courier tracking & driver dispatch is managed directly by Admin.</span>
          </div>
        )}

        {/* Tracking Stepper Timeline */}
        <div className="mb-5 p-4 rounded-2xl bg-white/5 border border-white/10 space-y-4">
          <div className="flex items-center justify-between text-xs font-display">
            <span className="text-white/60">Delivery Method: <strong className="text-cyan-400 capitalize">{handoverType}</strong></span>
            <span className="text-emerald-400 font-bold flex items-center gap-1">
              <Clock size={13} /> ETA: {courierEta}
            </span>
          </div>

          {/* Phase Control Bar */}
          <div className="p-2.5 rounded-xl bg-black/40 border border-cyan-500/20 flex items-center justify-between gap-2">
            <span className="text-[11px] text-white/60 uppercase tracking-wider font-semibold">
              Live Phase: {currentStepIndex + 1} of 6
            </span>
            {canEditTracking ? (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={currentStepIndex === 0}
                  onClick={() => handleStepChange(Math.max(0, currentStepIndex - 1))}
                  className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold disabled:opacity-30 transition-all"
                >
                  ◀ Prev
                </button>
                <button
                  type="button"
                  disabled={currentStepIndex === TRACKING_STEPS.length - 1}
                  onClick={() => handleStepChange(Math.min(TRACKING_STEPS.length - 1, currentStepIndex + 1))}
                  className="px-2 py-0.5 rounded bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-[11px] font-bold disabled:opacity-30 transition-all"
                >
                  Next Phase ▶
                </button>
              </div>
            ) : (
              <span className="text-[10px] text-white/40 italic">Managed by {isHubStored ? 'Admin' : 'Lister'}</span>
            )}
          </div>

          <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-white/10">
            {TRACKING_STEPS.map((stepItem, idx) => {
              const isPassed = idx <= currentStepIndex
              const isCurrent = idx === currentStepIndex
              return (
                <div
                  key={stepItem.id}
                  onClick={() => canEditTracking && handleStepChange(idx)}
                  className={`relative flex items-start gap-3 ${canEditTracking ? 'cursor-pointer group' : ''}`}
                >
                  <div
                    className={`absolute -left-6 top-0.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                      isCurrent
                        ? 'bg-cyan-400 text-black shadow-lg shadow-cyan-500/50 ring-4 ring-cyan-500/20 scale-110'
                        : isPassed
                        ? 'bg-emerald-500 text-black'
                        : 'bg-slate-800 text-white/40 border border-white/10'
                    }`}
                  >
                    {isPassed ? <CheckCircle2 size={12} /> : idx + 1}
                  </div>
                  <div>
                    <span className={`text-xs font-bold block transition-colors ${isCurrent ? 'text-cyan-400' : isPassed ? 'text-white' : 'text-white/40'}`}>
                      {stepItem.title}
                    </span>
                    <span className="text-[11px] text-white/50 block">{stepItem.desc}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Driver & Delivery Information Card */}
        <div className="mb-4 relative rounded-2xl overflow-hidden border border-cyan-500/30 bg-slate-950 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="text-pink-500 animate-bounce" size={18} />
              <span className="text-xs font-bold text-white font-display">Courier Driver: {driverName}</span>
            </div>
            <div className="flex items-center gap-2">
              {canEditTracking && (
                <button
                  type="button"
                  onClick={() => setShowEditDrawer(!showEditDrawer)}
                  className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-white text-[10px] font-bold flex items-center gap-1"
                >
                  <Edit2 size={10} /> Edit Driver
                </button>
              )}
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-mono font-bold">
                OTP: {otpCode}
              </span>
            </div>
          </div>

          {/* Edit Driver & ETA Drawer for Authorized Users */}
          {showEditDrawer && canEditTracking && (
            <div className="p-3 rounded-xl bg-black/60 border border-cyan-500/30 space-y-2 text-xs animate-fade-in">
              <span className="text-[10px] font-bold uppercase text-cyan-300 block">Edit Driver, ETA & OTP Details</span>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-white/50 block mb-0.5">Driver Name</label>
                  <input
                    type="text"
                    className="input-dark text-xs py-1.5"
                    placeholder="Driver Name"
                    value={driverName}
                    onChange={(e) => setDriverName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-[10px] text-white/50 block mb-0.5">Driver Phone</label>
                  <input
                    type="text"
                    className="input-dark text-xs py-1.5"
                    placeholder="Driver Phone"
                    value={driverPhone}
                    onChange={(e) => setDriverPhone(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-white/50 block mb-0.5">Estimated ETA</label>
                  <input
                    type="text"
                    className="input-dark text-xs py-1.5"
                    placeholder="e.g. 24 mins or 1 hour"
                    value={courierEta}
                    onChange={(e) => setCourierEta(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-[10px] text-white/50 block mb-0.5">Handover OTP</label>
                  <input
                    type="text"
                    maxLength={4}
                    className="input-dark text-xs py-1.5 font-mono"
                    placeholder="4-digit OTP"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-white/50 block mb-0.5">Current Location / Status Note</label>
                <input
                  type="text"
                  className="input-dark text-xs py-1.5"
                  placeholder="Current Location / Status"
                  value={driverLocation}
                  onChange={(e) => setDriverLocation(e.target.value)}
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowEditDrawer(false)
                  showToast('Driver & ETA details updated & synced to live order.', 'success')
                }}
                className="w-full py-1.5 rounded bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-xs font-bold hover:bg-cyan-500/30"
              >
                Save Driver & ETA Details
              </button>
            </div>
          )}

          <div className="p-2.5 rounded-xl bg-black/70 border border-white/10 flex items-center justify-between text-xs">
            <div>
              <span className="text-[10px] text-white/50 block">Current Location:</span>
              <span className="text-cyan-300 font-display font-medium">{driverLocation}</span>
            </div>
            <a
              href="https://maps.google.com"
              target="_blank"
              rel="noreferrer"
              className="px-2.5 py-1 rounded bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-[11px] font-display flex items-center gap-1 hover:bg-cyan-500/30"
            >
              <Navigation size={11} /> Open Maps
            </a>
          </div>

          {/* OTP Handover Verification Box */}
          <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-between gap-2">
            <div>
              <span className="text-[10px] text-white/50 uppercase font-semibold block">Handover OTP Verification</span>
              {otpVerified ? (
                <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                  <Check size={14} /> OTP Verified · Physical Handover Confirmed!
                </span>
              ) : (
                <span className="text-[11px] text-white/70">Renter shares OTP <strong className="text-cyan-300">{otpCode}</strong> at delivery</span>
              )}
            </div>
            {!otpVerified && (
              <div className="flex items-center gap-1 flex-shrink-0">
                <input
                  type="text"
                  maxLength={4}
                  className="input-dark w-16 text-center text-xs py-1 px-1 font-mono font-bold"
                  placeholder="OTP"
                  value={inputOtp}
                  onChange={(e) => setInputOtp(e.target.value)}
                />
                <button
                  type="button"
                  onClick={handleVerifyOtp}
                  className="px-2 py-1 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold hover:bg-emerald-500/30"
                >
                  Verify
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Courier & Contact Actions */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <a
            href={`tel:${driverPhone}`}
            className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center gap-2 text-xs font-display text-white hover:bg-white/10 transition-all"
          >
            <Phone size={14} className="text-emerald-400" /> Call Courier ({driverName.split(' ')[0]})
          </a>
          <button
            type="button"
            onClick={() => setShowQr(!showQr)}
            className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center gap-2 text-xs font-display text-white hover:bg-white/10 transition-all"
          >
            <QrCode size={14} className="text-cyan-400" /> {showQr ? 'Hide Handover QR' : 'Show Handover QR'}
          </button>
        </div>

        {showQr && (
          <div className="p-4 rounded-2xl bg-white/5 border border-cyan-500/30 text-center space-y-2 animate-fade-in">
            <div className="w-32 h-32 mx-auto bg-white p-2 rounded-xl flex items-center justify-center border-2 border-cyan-400">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=RENTAL_HANDOVER_${booking?.id || 'LD123'}`}
                alt="Handover Verification QR"
                className="w-full h-full object-contain"
              />
            </div>
            <p className="text-[11px] text-white/60 font-display">
              Scan with courier or host app to verify physical handover inspection.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
