import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  X, Navigation, Phone, MapPin, CheckCircle2, Clock, Shield, Lock,
  Copy, Check, Truck, MessageCircle, ArrowUpRight, KeyRound, Star
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import {
  TRACKING_STATUS_CONFIG,
  getBookingTracking,
  updateBookingTracking,
  calculateRemainingEta,
} from '../lib/trackingService'
import { useDeliveryPartners } from '../hooks/useDeliveryPartners'

export default function LiveTrackingModal({ booking, onClose, isAdmin = false }) {
  const { user } = useAuth()
  const { showToast } = useToast()

  const isUserAdmin = isAdmin || Boolean(user?.is_admin) || user?.user_metadata?.role === 'admin'
  const isLister = user?.id === (booking?.lister_id || booking?.listings?.user_id)
  const isHubStored = booking?.listings?.fulfillment_type === 'warehouse'
  const canManageEta = isUserAdmin || (isLister && !isHubStored)

  const { drivers: availableDrivers } = useDeliveryPartners()
  const [tracking, setTracking] = useState(null)
  const [loading, setLoading] = useState(true)
  const [copiedOtp, setCopiedOtp] = useState(false)
  const [savingDriver, setSavingDriver] = useState(false)
  const [editingEta, setEditingEta] = useState(false)
  const [etaInput, setEtaInput] = useState('')
  const [liveEta, setLiveEta] = useState('')

  const bookingId = booking?.id
  const listingTitle = booking?.listings?.title || 'Gaming Hardware'
  const deliveryAddress = booking?.delivery_address || 'Bangalore Address'

  useEffect(() => {
    let isMounted = true
    async function init() {
      setLoading(true)
      const trk = await getBookingTracking(bookingId, booking)
      if (isMounted) {
        setTracking(trk)
        setEtaInput(String(trk?.eta_minutes || 30))
      }
      if (isMounted) setLoading(false)
    }
    init()
    return () => { isMounted = false }
  }, [bookingId, booking])

  // Live countdown timer: recalculates ETA every 5 seconds
  useEffect(() => {
    if (!tracking) return
    const update = () => {
      setLiveEta(calculateRemainingEta(tracking))
    }
    update()
    const timer = setInterval(update, 5000)
    return () => clearInterval(timer)
  }, [tracking])

  const currentStatusKey = tracking?.tracking_status || 'awaiting_confirmation'
  const currentConfig = TRACKING_STATUS_CONFIG[currentStatusKey] || TRACKING_STATUS_CONFIG.awaiting_confirmation
  const activeStep = currentConfig.stepIndex

  const handleUpdateStatus = async (nextStatusKey) => {
    try {
      const updated = await updateBookingTracking(bookingId, {
        tracking_status: nextStatusKey,
      })
      setTracking(updated)
      showToast(`Status: ${TRACKING_STATUS_CONFIG[nextStatusKey]?.title}`, 'success')
    } catch (err) {
      showToast(err.message || 'Failed to update tracking status', 'error')
    }
  }

  const handleAssignDriver = async (driverId) => {
    if (!driverId) return
    const selected = availableDrivers.find((d) => d.id === driverId)
    if (!selected) return

    setSavingDriver(true)
    try {
      const updated = await updateBookingTracking(bookingId, {
        driver: {
          id: selected.id,
          name: selected.name,
          phone: selected.phone,
          vehicle_type: selected.vehicle_type,
          vehicle_number: selected.vehicle_number,
          avatar: selected.avatar,
          rating: selected.rating,
        },
      })
      setTracking(updated)
      showToast(`Assigned ${selected.name}`, 'success')
    } catch (err) {
      showToast(err.message || 'Failed to assign driver', 'error')
    } finally {
      setSavingDriver(false)
    }
  }

  const handleSaveEtaMinutes = async (minutesVal) => {
    const rawNum = parseInt(String(minutesVal).replace(/[^\d]/g, ''), 10)
    const mins = isNaN(rawNum) || rawNum <= 0 ? 30 : rawNum
    try {
      const targetTime = new Date(Date.now() + mins * 60000).toISOString()
      const updated = await updateBookingTracking(bookingId, {
        eta: `${mins} mins`,
        eta_minutes: mins,
        eta_target_time: targetTime,
      })
      setTracking(updated)
      setEditingEta(false)
      showToast(`ETA set to ${mins} mins (live countdown started)`, 'success')
    } catch (err) {
      showToast(err.message || 'Failed to save ETA', 'error')
    }
  }

  const handleCopyOtp = (code) => {
    navigator.clipboard.writeText(code)
    setCopiedOtp(true)
    showToast('Delivery OTP copied!', 'success')
    setTimeout(() => setCopiedOtp(false), 2000)
  }

  const driver = tracking?.driver

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="glass relative w-full max-w-2xl rounded-3xl p-5 sm:p-6 border border-cyan-500/30 bg-slate-950/95 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
        {/* Top Header Row */}
        <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0 bg-cyan-500/15 border border-cyan-500/30 text-cyan-400">
              <Truck size={20} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="font-bungee text-base sm:text-lg text-white truncate leading-tight">
                  {listingTitle}
                </h2>
                {isHubStored && (
                  <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-[10px] font-bold uppercase items-center gap-1">
                    <Shield size={10} /> Hub
                  </span>
                )}
              </div>
              <p className="text-[11px] text-white/50 font-display">
                Order #{bookingId?.slice(0, 8)} · Handover Delivery
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              Live Radar
            </span>
            <button
              onClick={onClose}
              type="button"
              className="p-1.5 rounded-xl text-white/50 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Close modal"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Unified Live Transit & Milestones Card */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900/90 via-slate-900/50 to-slate-900/90 border border-cyan-500/30 space-y-3 relative overflow-hidden">
          {/* Status Header */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-bold tracking-wider text-white/50">Current Status:</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${currentConfig.badgeClass}`}>
                  {currentConfig.badge}
                </span>
              </div>
              <h3 className="font-bungee text-sm sm:text-base text-white mt-0.5">
                {currentConfig.title}
              </h3>
            </div>

            {/* Compact Dynamic ETA Pill with Countdown */}
            <div className="flex flex-col sm:flex-row items-end sm:items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-black/60 border border-white/10 text-xs shadow-inner">
              <div className="flex items-center gap-1.5">
                <Clock size={13} className="text-cyan-400 animate-pulse" />
                <span className="text-white/50 text-[11px] font-medium">ETA:</span>
                <strong className={`font-bold text-xs ${
                  liveEta.includes('moment') ? 'text-amber-300 animate-bounce' : 'text-emerald-400'
                }`}>
                  {liveEta || calculateRemainingEta(tracking)}
                </strong>
                {canManageEta && !editingEta && (
                  <button
                    type="button"
                    onClick={() => setEditingEta(true)}
                    className="text-[10px] text-cyan-400 font-semibold underline hover:text-cyan-300 ml-1"
                  >
                    Adjust
                  </button>
                )}
              </div>

              {canManageEta && editingEta && (
                <div className="flex items-center gap-1.5 pt-1 sm:pt-0 sm:pl-2 sm:border-l sm:border-white/10 flex-wrap">
                  <div className="flex items-center gap-1">
                    {[15, 25, 35, 45, 60].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => handleSaveEtaMinutes(preset)}
                        className="px-1.5 py-0.5 rounded bg-white/10 hover:bg-cyan-500/30 text-white/80 hover:text-cyan-200 text-[10px] font-mono font-bold transition-colors"
                      >
                        {preset}m
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="1"
                      max="300"
                      value={etaInput}
                      onChange={(e) => setEtaInput(e.target.value)}
                      className="input-dark py-0 px-1 text-xs w-14 font-semibold text-center"
                      placeholder="Mins"
                    />
                    <span className="text-[10px] text-white/40">m</span>
                    <button
                      type="button"
                      onClick={() => handleSaveEtaMinutes(etaInput)}
                      className="px-2 py-0.5 rounded bg-cyan-500 text-black text-[10px] font-bold hover:bg-cyan-400 transition-colors"
                    >
                      Set
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingEta(false)}
                      className="text-white/40 hover:text-white text-[10px] px-1"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Connected 4-Step Stepper with Integrated Transit Bar */}
          <div className="pt-1">
            <div className="relative flex items-center justify-between">
              {/* Background Line */}
              <div className="absolute left-4 right-4 top-3.5 h-1 bg-white/10 rounded-full z-0" />
              {/* Animated Progress Line */}
              <div
                className="absolute left-4 top-3.5 h-1 bg-gradient-to-r from-cyan-500 via-emerald-400 to-pink-500 rounded-full transition-all duration-500 z-0"
                style={{
                  width:
                    activeStep === 0 ? '5%' :
                    activeStep === 1 ? '33%' :
                    activeStep === 2 ? '66%' : '90%',
                }}
              />

              {Object.values(TRACKING_STATUS_CONFIG).slice(0, 4).map((step, idx) => {
                const isPast = idx < activeStep
                const isCurrent = idx === activeStep
                return (
                  <div key={step.key} className="relative z-10 flex flex-col items-center">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold transition-all ${
                        isCurrent
                          ? 'bg-cyan-400 text-black ring-4 ring-cyan-500/20 shadow-lg shadow-cyan-500/50 scale-105'
                          : isPast
                          ? 'bg-emerald-500 text-black'
                          : 'bg-slate-900 text-white/40 border border-white/10'
                      }`}
                    >
                      {isPast ? <Check size={13} /> : idx === 2 ? '🛵' : idx + 1}
                    </div>
                    <span
                      className={`text-[10px] font-display font-semibold mt-1 tracking-tight ${
                        isCurrent ? 'text-cyan-300' : isPast ? 'text-white' : 'text-white/30'
                      }`}
                    >
                      {step.title.split('&')[0].trim()}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          <p className="text-[11px] text-white/60 font-display pt-1 border-t border-white/5">
            {currentConfig.desc}
          </p>
        </div>

        {/* 2-Column Grid: Delivery Partner & Dual OTP Handshake (Saves huge vertical space) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {/* Card 1: Assigned Delivery Partner */}
          <div className="p-4 rounded-2xl border border-cyan-500/30 bg-slate-950/80 flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                <Truck size={12} /> Delivery Partner
              </span>
              {driver && (
                <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 text-[9px] font-bold uppercase">
                  Verified
                </span>
              )}
            </div>

            {driver ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <img
                    src={driver.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80'}
                    alt={driver.name}
                    className="w-11 h-11 rounded-xl object-cover border border-cyan-500/30 flex-shrink-0"
                  />
                  <div className="min-w-0">
                    <h4 className="font-bungee text-xs sm:text-sm text-white truncate">{driver.name}</h4>
                    <div className="flex items-center gap-2 text-[11px] text-white/60 mt-0.5">
                      <span className="flex items-center gap-0.5 text-amber-400 font-bold">
                        <Star size={10} className="fill-amber-400" /> {driver.rating || '4.9'}
                      </span>
                      <span>·</span>
                      <span className="truncate">{driver.vehicle_type}</span>
                    </div>
                    <div className="text-[10px] font-mono text-cyan-300 font-semibold">
                      {driver.vehicle_number}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <a
                    href={`tel:${driver.phone}`}
                    className="py-1.5 px-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white text-[11px] font-display font-semibold flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Phone size={11} className="text-emerald-400" />
                    <span>Call Driver</span>
                  </a>
                  <a
                    href={`https://wa.me/${driver.phone?.replace(/[^0-9]/g, '')}?text=Hi%20${encodeURIComponent(driver.name)},%20inquiring%20about%20order%20${bookingId?.slice(0, 8)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="py-1.5 px-2 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-[11px] font-display font-semibold flex items-center justify-center gap-1.5 transition-all"
                  >
                    <MessageCircle size={11} />
                    <span>WhatsApp</span>
                  </a>
                </div>
              </div>
            ) : (
              <div className="py-4 text-center space-y-1">
                <p className="text-xs text-white/70 font-display">
                  No delivery partner assigned yet.
                </p>
                <p className="text-[10px] text-white/40">
                  {isUserAdmin ? 'Select partner below to dispatch.' : 'Admin assigns courier upon packaging.'}
                </p>
              </div>
            )}

            {/* Admin Driver Dispatch Selector */}
            {isUserAdmin && (
              <div className="pt-2 border-t border-white/10">
                <div className="flex items-center justify-between text-[10px] text-white/50 mb-1">
                  <span>Assign Courier:</span>
                  <Link to="/admin" className="text-cyan-400 hover:underline flex items-center gap-0.5">
                    Drivers Portal <ArrowUpRight size={9} />
                  </Link>
                </div>
                <select
                  className="select-dark text-[11px] w-full py-1"
                  value={driver?.id || ''}
                  onChange={(e) => handleAssignDriver(e.target.value)}
                  disabled={savingDriver}
                >
                  <option value="">-- Choose Delivery Partner --</option>
                  {availableDrivers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.vehicle_type})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Card 2: Dual OTP Handshake */}
          <div className="p-4 rounded-2xl border border-pink-500/30 bg-slate-950/80 flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-pink-400 flex items-center gap-1.5">
                <KeyRound size={12} /> Delivery OTP Handshake
              </span>
              {tracking?.verified ? (
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold flex items-center gap-1 border border-emerald-500/40">
                  <CheckCircle2 size={10} /> Verified
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold">
                  Pending Handover
                </span>
              )}
            </div>

            {/* Renter PIN Box */}
            <div className="p-3 rounded-xl bg-black/60 border border-white/10 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-white/50 uppercase font-semibold block">
                  Customer Handover PIN
                </span>
                <span className="font-mono text-xl sm:text-2xl font-black text-cyan-300 tracking-wider">
                  {tracking?.renter_otp || '----'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleCopyOtp(tracking?.renter_otp)}
                className="px-2.5 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-xs font-bold flex items-center gap-1 border border-cyan-500/30 transition-all"
              >
                {copiedOtp ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                <span>{copiedOtp ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            <p className="text-[10px] text-white/50 font-display leading-tight">
              🛡️ Share this PIN with the driver <em>only</em> after inspecting the gear at your doorstep.
            </p>

            {/* Admin / Driver Portal Link */}
            {(isUserAdmin || isLister) && (
              <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px]">
                <span className="text-white/40">
                  Driver OTP: <strong className="text-pink-300 font-mono">{tracking?.driver_otp}</strong>
                </span>
                <Link
                  to={`/verify-delivery?id=${bookingId}`}
                  target="_blank"
                  className="px-2 py-0.5 rounded bg-pink-500/20 text-pink-300 hover:bg-pink-500/30 text-[10px] font-bold flex items-center gap-1"
                >
                  Verify Portal <ArrowUpRight size={10} />
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Compact Delivery Address Row */}
        <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <MapPin size={14} className="text-pink-400 flex-shrink-0" />
            <span className="text-[11px] text-white/50 truncate">
              Destination: <strong className="text-white/80">{deliveryAddress}</strong>
            </span>
          </div>
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(deliveryAddress)}`}
            target="_blank"
            rel="noreferrer"
            className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-cyan-300 text-[11px] font-display flex items-center gap-1 border border-white/10 flex-shrink-0"
          >
            <Navigation size={10} /> Maps
          </a>
        </div>

        {/* Role-Specific Controls */}
        {/* 1. Lister Confirm Button (if awaiting) */}
        {isLister && !isUserAdmin && currentStatusKey === 'awaiting_confirmation' && !isHubStored && (
          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-between gap-3">
            <span className="text-xs text-white/70">Ready to fulfill this booking?</span>
            <button
              type="button"
              onClick={() => handleUpdateStatus('confirmed')}
              className="btn-primary text-xs py-1.5 px-4 font-bold"
            >
              ✓ Confirm Booking
            </button>
          </div>
        )}

        {/* 2. Admin Quick Control Deck */}
        {isUserAdmin && (
          <div className="p-3 rounded-xl bg-cyan-950/30 border border-cyan-500/20 flex items-center justify-between gap-2 flex-wrap text-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-300">
              Admin Status Override:
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleUpdateStatus('awaiting_confirmation')}
                className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all border ${
                  currentStatusKey === 'awaiting_confirmation'
                    ? 'bg-amber-500 text-black border-amber-400'
                    : 'bg-white/5 text-white/60 border-white/10 hover:bg-white/10'
                }`}
              >
                1. Awaiting
              </button>
              <button
                type="button"
                onClick={() => handleUpdateStatus('confirmed')}
                className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all border ${
                  currentStatusKey === 'confirmed'
                    ? 'bg-blue-500 text-white border-blue-400'
                    : 'bg-white/5 text-white/60 border-white/10 hover:bg-white/10'
                }`}
              >
                2. Confirmed
              </button>
              <button
                type="button"
                onClick={() => handleUpdateStatus('on_the_way')}
                className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all border ${
                  currentStatusKey === 'on_the_way'
                    ? 'bg-cyan-500 text-black border-cyan-400'
                    : 'bg-white/5 text-white/60 border-white/10 hover:bg-white/10'
                }`}
              >
                3. On The Way
              </button>
              <button
                type="button"
                onClick={() => handleUpdateStatus('delivered')}
                className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all border ${
                  currentStatusKey === 'delivered'
                    ? 'bg-emerald-500 text-black border-emerald-400'
                    : 'bg-white/5 text-white/60 border-white/10 hover:bg-white/10'
                }`}
              >
                4. Delivered
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
