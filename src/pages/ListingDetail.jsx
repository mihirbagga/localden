import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft, MapPin, Star, Shield, Calendar,
  ChevronLeft, ChevronRight, Share2, Heart,
  CheckCircle, AlertCircle, User, CreditCard, X,
} from 'lucide-react'
import GameBackground from '../components/GameBackground'
import ListingCard from '../components/ListingCard'
import AvailableCoupons from '../components/AvailableCoupons'
import PaymentOptions from '../components/PaymentOptions'
import { useListingById } from '../hooks/useListings'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { useRazorpay } from '../hooks/useRazorpay'
import { usePaymentMethods } from '../hooks/usePaymentMethods'
import { useAvailableCoupons } from '../hooks/useAvailableCoupons'
import { usePlatformFee } from '../hooks/usePlatformFee'
import { supabase } from '../lib/supabase'
import { normalizeCouponCode, priceWithCoupon, validateCoupon } from '../lib/coupons'
import { platformFeeLabel } from '../lib/platformFee'
import { isOnlineMethod, methodConfig, payButtonLabel } from '../lib/payments'
import { listingUnits, rangeHasBusy, shiftIso, todayIso } from '../lib/bookingDates'
import { useBusyDates } from '../hooks/useBusyDates'
import AvailabilityCalendar from '../components/AvailabilityCalendar'
import './terms.css'
import './couponApply.css'
import './listingDetail.css'

const SAVED_KEY = 'ldSaved'
const HOW_STEPS = [
  { title: 'Pick dates', body: 'Grey days on the calendar are already booked. Total updates live.' },
  { title: 'Pay + deposit', body: 'Coupon, then UPI / QR / Razorpay / cash. Deposit sits until return.' },
  { title: 'Handover', body: 'Pickup or delivery. Check-in photos, then check-out when you return.' },
]

function weekendRange() {
  const start = new Date()
  start.setHours(12, 0, 0, 0)
  const dow = start.getDay()
  const satAdd = dow === 6 ? 0 : dow === 0 ? 6 : (6 - dow)
  return { from: shiftIso(todayIso(), satAdd), to: shiftIso(todayIso(), satAdd + 2) }
}

function conditionLabel(value) {
  if (value === 'like_new') return 'Like New'
  if (value === 'good') return 'Good'
  if (value === 'fair') return 'Fair'
  return value || '—'
}

function readSaved() {
  try {
    const raw = JSON.parse(localStorage.getItem(SAVED_KEY) || '[]')
    return Array.isArray(raw) ? raw : []
  } catch {
    return []
  }
}

function PhotoGallery({ photos, emoji, title }) {
  const [idx, setIdx] = useState(0)
  const [open, setOpen] = useState(false)
  const hasPhotos = photos?.length > 0

  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false)
      if (e.key === 'ArrowLeft') setIdx((i) => (i - 1 + photos.length) % photos.length)
      if (e.key === 'ArrowRight') setIdx((i) => (i + 1) % photos.length)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, photos?.length])

  if (!hasPhotos) {
    return (
      <div className="ld-gallery__empty" aria-hidden="true">{emoji || '🎮'}</div>
    )
  }

  const prev = () => setIdx((i) => (i - 1 + photos.length) % photos.length)
  const next = () => setIdx((i) => (i + 1) % photos.length)

  return (
    <div className="ld-gallery">
      <div className="ld-gallery__main">
        <img src={photos[idx]} alt={`${title || 'Listing'} photo ${idx + 1}`} />
        {photos.length > 1 ? (
          <>
            <button type="button" className="ld-gallery__nav is-prev" onClick={prev} aria-label="Previous photo">
              <ChevronLeft size={18} />
            </button>
            <button type="button" className="ld-gallery__nav is-next" onClick={next} aria-label="Next photo">
              <ChevronRight size={18} />
            </button>
            <div className="ld-gallery__dots">
              {photos.map((_, i) => (
                <button
                  key={photos[i]}
                  type="button"
                  className={`ld-gallery__dot${i === idx ? ' is-on' : ''}`}
                  onClick={() => setIdx(i)}
                  aria-label={`Show photo ${i + 1}`}
                />
              ))}
            </div>
          </>
        ) : null}
        <button type="button" className="ld-gallery__open" onClick={() => setOpen(true)} aria-label="Open photo full screen">
          Full view
        </button>
      </div>
      {photos.length > 1 ? (
        <div className="ld-thumbs">
          {photos.map((src, i) => (
            <button
              key={src}
              type="button"
              className={i === idx ? 'is-on' : ''}
              onClick={() => setIdx(i)}
              aria-label={`Thumbnail ${i + 1}`}
            >
              <img src={src} alt="" />
            </button>
          ))}
        </div>
      ) : null}
      {open ? createPortal(
        <div className="ld-lightbox" role="dialog" aria-modal="true" aria-label="Photo viewer">
          <button type="button" className="ld-icon-btn ld-lightbox__x" onClick={() => setOpen(false)} aria-label="Close photo">
            <X size={16} />
          </button>
          {photos.length > 1 ? (
            <>
              <button type="button" className="ld-gallery__nav is-prev" onClick={prev} aria-label="Previous photo">
                <ChevronLeft size={18} />
              </button>
              <button type="button" className="ld-gallery__nav is-next" onClick={next} aria-label="Next photo">
                <ChevronRight size={18} />
              </button>
            </>
          ) : null}
          <img src={photos[idx]} alt={`${title || 'Listing'} full view`} />
        </div>,
        document.body
      ) : null}
    </div>
  )
}

function ShareLinkBox() {
  const { showToast } = useToast()
  const url = window.location.href.replace(/\?rent=1/, '')

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      showToast('Link copied', 'success')
    } catch {
      showToast('Copy failed', 'error')
    }
  }

  return (
    <div className="ld-share">
      <span>{url.replace(/^https?:\/\//, '')}</span>
      <button type="button" className="btn-outline" onClick={copy} aria-label="Copy listing link">Copy</button>
    </div>
  )
}

function BookingWidget({ listing, mobile = false, forceOpen = false }) {
  const { isAuthenticated, user, profile, isBanned } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const { openCheckout, loading: rzpLoading } = useRazorpay()
  const { methods: payMethods } = usePaymentMethods({ enabledOnly: true })
  const { coupons: openCoupons } = useAvailableCoupons()
  const { fee: platformFeeSetting } = usePlatformFee()

  const isOwner = isAuthenticated && user?.id === listing.user_id
  const today = todayIso()
  const uid = mobile ? 'm' : 'd'
  const units = listingUnits(listing)
  const { busy } = useBusyDates(listing.id, units)
  const busyRef = useRef(busy)
  busyRef.current = busy
  const outOfStock = listing.is_available === false

  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [quick, setQuick] = useState('')
  const [booking, setBooking] = useState(null)
  const [payError, setPayError] = useState('')
  const [saving, setSaving] = useState(false)
  const [couponInput, setCouponInput] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState(null)
  const [couponBusy, setCouponBusy] = useState(false)
  const [payMethodId, setPayMethodId] = useState('')
  const [paymentRef, setPaymentRef] = useState('')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [handover, setHandover] = useState('pickup')
  const [address, setAddress] = useState('')
  const [stepFocus, setStepFocus] = useState(1)

  const days = startDate && endDate
    ? Math.max(1, Math.ceil((new Date(endDate) - new Date(startDate)) / 86400000))
    : 0
  const deposit = listing.deposit_amount || 5000
  const priced = priceWithCoupon({
    days,
    priceDay: listing.price_day,
    deposit,
    coupon: appliedCoupon,
    fee: platformFeeSetting,
  })
  const { subtotal, discount, platformFee, total } = priced
  const selectedPay = payMethods.find((m) => m.id === payMethodId) || payMethods[0] || null

  const step = days < 1 ? 1 : 2 + (acceptTerms ? 1 : 0)

  const applyRange = (from, to, chip) => {
    if (from && to && rangeHasBusy(from, to, busyRef.current)) {
      showToast('Those dates are already booked.', 'error')
      setStartDate(from)
      setEndDate('')
      setQuick('')
      return
    }
    setStartDate(from)
    setEndDate(to)
    setQuick(chip)
    if (from && to) setStepFocus(2)
  }

  useEffect(() => {
    if (!payMethodId && payMethods[0]) setPayMethodId(payMethods[0].id)
  }, [payMethodId, payMethods])

  useEffect(() => {
    if (forceOpen && mobile && isAuthenticated && !isOwner) setSheetOpen(true)
  }, [forceOpen, mobile, isAuthenticated, isOwner])

  useEffect(() => {
    const onQuick = (e) => {
      const kind = e.detail
      const start = todayIso()
      if (kind === 'tonight') applyRange(start, shiftIso(start, 1), 'tonight')
      if (kind === 'weekend') {
        const range = weekendRange()
        applyRange(range.from, range.to, 'weekend')
      }
      if (kind === 'week') applyRange(start, shiftIso(start, 7), 'week')
    }
    window.addEventListener('ld-quick-date', onQuick)
    return () => window.removeEventListener('ld-quick-date', onQuick)
  }, [])

  useEffect(() => {
    if (!sheetOpen) return undefined
    const onKey = (e) => { if (e.key === 'Escape') setSheetOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [sheetOpen])

  const saveBooking = async ({ paymentId, method, paid }) => {
    setSaving(true)
    const bookingId = crypto.randomUUID()
    const { error } = await supabase.from('bookings').insert({
      id: bookingId,
      listing_id: listing.id,
      renter_id: user.id,
      lister_id: listing.user_id,
      start_date: startDate,
      end_date: endDate,
      total_days: days,
      price_per_day: listing.price_day,
      subtotal,
      platform_fee: platformFee,
      deposit,
      discount_amount: discount,
      coupon_id: appliedCoupon?.id || null,
      coupon_code: appliedCoupon?.code || null,
      total_amount: total,
      status: paid ? 'confirmed' : 'pending',
      payment_status: paid ? 'paid' : 'pending',
      payment_method: method?.id || null,
      payment_ref: paymentRef.trim() || null,
      razorpay_payment_id: paymentId || null,
      delivery_type: handover,
      delivery_address: handover === 'delivery' ? address.trim() || null : null,
    })
    setSaving(false)
    if (error) {
      const taken = /already booked/i.test(error.message || '')
      setPayError(taken ? 'Those dates were just booked. Pick another range.' : 'Payment ok, booking save failed. Contact support.')
      showToast(taken ? 'Those dates are already booked.' : 'Booking save failed. Contact support.', 'error')
      return
    }
    await supabase.from('listings').update({
      total_bookings: (listing.total_bookings || 0) + 1,
      updated_at: new Date().toISOString(),
    }).eq('id', listing.id)
    setBooking({
      id: bookingId,
      startDate,
      endDate,
      days,
      total,
      paymentId,
      couponCode: appliedCoupon?.code,
      discount,
      paid,
      methodName: method?.name,
    })
    showToast(paid ? 'Booking confirmed' : 'Booking placed. Await payment confirm.', 'success')
  }

  const tryApplyCoupon = (coupon) => {
    const invalid = validateCoupon(coupon, subtotal, user?.id)
    if (invalid) {
      setAppliedCoupon(null)
      showToast(invalid, 'error')
      return false
    }
    setAppliedCoupon(coupon)
    setCouponInput(coupon.code)
    showToast(`Coupon ${coupon.code} applied`, 'success')
    return true
  }

  const applyCoupon = async () => {
    const code = normalizeCouponCode(couponInput)
    if (!code) {
      showToast('Enter a coupon code.', 'error')
      return
    }
    if (days < 1) {
      showToast('Select dates first.', 'error')
      return
    }
    const listed = openCoupons.find((c) => normalizeCouponCode(c.code) === code)
    if (listed) {
      tryApplyCoupon(listed)
      return
    }
    setCouponBusy(true)
    const { data, error } = await supabase.from('coupons').select('*').ilike('code', code).maybeSingle()
    setCouponBusy(false)
    if (error) {
      showToast(error.message || 'Could not check coupon.', 'error')
      return
    }
    tryApplyCoupon(data)
  }

  const clearCoupon = () => {
    setAppliedCoupon(null)
    setCouponInput('')
    showToast('Coupon removed', 'info')
  }

  useEffect(() => {
    if (!appliedCoupon || days < 1) return
    const invalid = validateCoupon(appliedCoupon, days * (listing.price_day || 0), user?.id)
    if (!invalid) return
    setAppliedCoupon(null)
    showToast(invalid, 'error')
  }, [appliedCoupon, days, listing.price_day, showToast])

  const handleBook = async () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: { pathname: `/listing/${listing.id}?rent=1` } } })
      return
    }
    if (isBanned) {
      showToast('Account banned. Contact support.', 'error')
      return
    }
    if (outOfStock) {
      showToast('This item is out of stock.', 'error')
      return
    }
    if (!startDate || !endDate || days < 1) {
      showToast('Pick rental dates first.', 'error')
      setStepFocus(1)
      return
    }
    if (rangeHasBusy(startDate, endDate, busyRef.current)) {
      showToast('Those dates are already booked.', 'error')
      setStepFocus(1)
      return
    }
    if (!acceptTerms) {
      showToast('Accept Terms and Damage Policy first.', 'error')
      setStepFocus(3)
      return
    }
    if (!selectedPay) {
      showToast('No payment method enabled. Ask admin.', 'error')
      return
    }
    if (handover === 'delivery' && !address.trim()) {
      showToast('Add a delivery address.', 'error')
      return
    }
    setPayError('')

    if (!isOnlineMethod(selectedPay)) {
      await saveBooking({ method: selectedPay, paid: false, paymentId: null })
      return
    }

    const keyId = methodConfig(selectedPay).key_id
    await openCheckout({
      amount: total,
      name: listing.title,
      description: `${days} day${days > 1 ? 's' : ''} rental · ${startDate} to ${endDate}`,
      keyId,
      prefill: {
        name: profile?.full_name || '',
        email: user?.email || '',
        contact: profile?.phone || '',
      },
      notes: {
        listing_id: listing.id,
        renter_id: user.id,
        start_date: startDate,
        end_date: endDate,
        coupon: appliedCoupon?.code || '',
      },
      onSuccess: (paymentId) => saveBooking({ paymentId, method: selectedPay, paid: true }),
      onFailure: (err) => {
        if (err.message !== 'Payment dismissed') {
          const msg = err.description || err.message || 'Payment failed. Please try again.'
          setPayError(msg)
          showToast(msg, 'error')
        }
      },
    })
  }

  if (isOwner && mobile) {
    return <p className="ld-hint">Your listing · share the link</p>
  }

  if (isOwner) {
    return (
      <div className="glass ld-book ld-owner is-sticky" id="rent-now">
        <div className="text-4xl" aria-hidden="true">🏠</div>
        <h3>Your Listing</h3>
        <p>You cannot rent your own gear. Share this page.</p>
        <ShareLinkBox />
        <Link to="/dashboard?tab=listings" className="btn-outline w-full">Manage in Dashboard</Link>
      </div>
    )
  }

  if (booking) {
    const successCard = (
      <div className="glass ld-book ld-success is-sticky">
        <CheckCircle size={36} />
        <h3>{booking.paid ? 'You are booked' : 'Request sent'}</h3>
        <p>
          {booking.paid
            ? 'Payment in. Lister will ping you for handover.'
            : 'Pay marked. Lister or admin confirms when money shows.'}
        </p>
        <div className="ld-facts">
          <div><span>Dates</span><b>{booking.startDate} → {booking.endDate}</b></div>
          <div><span>Days</span><b>{booking.days}</b></div>
          <div><span>Total</span><b>₹{booking.total}</b></div>
          {booking.methodName ? <div><span>Pay</span><b>{booking.methodName}</b></div> : null}
          {booking.couponCode ? <div><span>Coupon</span><b>{booking.couponCode} −₹{booking.discount}</b></div> : null}
        </div>
        <Link to="/dashboard?tab=bookings" className="btn-primary w-full">View in My Bookings</Link>
      </div>
    )
    if (mobile) {
      return createPortal(
        <div className="listing-sheet" role="dialog" aria-modal="true" aria-label="Booking status">
          {successCard}
        </div>,
        document.body
      )
    }
    return successCard
  }

  const isProcessing = rzpLoading || saving

  const formCard = (
    <div className="glass ld-book is-sticky" id={mobile ? undefined : 'rent-now'}>
      <div className="ld-book__price">
        <strong>₹{listing.price_day}</strong>
        <span>/day</span>
        {listing.price_weekend > 0 ? <span className="ml-auto">Wknd ₹{listing.price_weekend}</span> : null}
      </div>

      <div className="ld-steps" role="tablist" aria-label="Rent steps">
        {[
          { n: 1, label: '1 · Dates' },
          { n: 2, label: '2 · Pay' },
          { n: 3, label: '3 · Confirm' },
        ].map((item) => (
          <button
            key={item.n}
            type="button"
            className={`ld-step${stepFocus === item.n ? ' is-on' : ''}${step > item.n ? ' is-done' : ''}`}
            onClick={() => setStepFocus(item.n)}
            aria-pressed={stepFocus === item.n}
          >
            {item.label}
          </button>
        ))}
      </div>

      {outOfStock ? <p className="ld-hint">Out of stock right now. Check similar gear below.</p> : null}

      <p className="field-label">Quick dates</p>
      <div className="ld-chips" role="group" aria-label="Quick rental dates">
        <button type="button" className={`ld-chip${quick === 'tonight' ? ' is-on' : ''}`} onClick={() => applyRange(today, shiftIso(today, 1), 'tonight')} aria-label="Rent tonight">Tonight</button>
        <button type="button" className={`ld-chip${quick === 'weekend' ? ' is-on' : ''}`} onClick={() => { const w = weekendRange(); applyRange(w.from, w.to, 'weekend') }} aria-label="Rent this weekend">Weekend</button>
        <button type="button" className={`ld-chip${quick === '3' ? ' is-on' : ''}`} onClick={() => applyRange(today, shiftIso(today, 3), '3')} aria-label="Rent three days">3 days</button>
        <button type="button" className={`ld-chip${quick === 'week' ? ' is-on' : ''}`} onClick={() => applyRange(today, shiftIso(today, 7), 'week')} aria-label="Rent one week">Week</button>
      </div>

      <AvailabilityCalendar
        busy={busy}
        startDate={startDate}
        endDate={endDate}
        onPick={(from, to) => applyRange(from, to, '')}
        disabled={outOfStock}
      />

      <div className="ld-dates">
        <div>
          <label className="field-label" htmlFor={`book-from-${uid}`}>FROM</label>
          <input
            id={`book-from-${uid}`}
            type="date"
            value={startDate}
            min={today}
            onChange={(e) => {
              const next = e.target.value
              setQuick('')
              if (endDate && endDate <= next) {
                applyRange(next, '')
                return
              }
              applyRange(next, endDate)
            }}
            className="input-dark"
            aria-label="Rental start date"
          />
        </div>
        <div>
          <label className="field-label" htmlFor={`book-to-${uid}`}>TO</label>
          <input
            id={`book-to-${uid}`}
            type="date"
            value={endDate}
            min={startDate || today}
            onChange={(e) => applyRange(startDate, e.target.value)}
            className="input-dark"
            aria-label="Rental end date"
          />
        </div>
      </div>

      {days > 0 ? (
        <div className="ld-break">
          <div><span>₹{listing.price_day} × {days} day{days === 1 ? '' : 's'}</span><b>₹{subtotal}</b></div>
          {discount > 0 ? <div className="is-off"><span>Coupon {appliedCoupon?.code}</span><b>−₹{discount}</b></div> : null}
          {platformFee > 0 ? <div><span>{platformFeeLabel(platformFeeSetting)}</span><b>₹{platformFee}</b></div> : null}
          <div><span>Security deposit</span><b>₹{deposit}</b></div>
          <div className="is-total"><span>Total</span><span>₹{total}</span></div>
          <p>Deposit back after a clean return.</p>
        </div>
      ) : (
        <p className="ld-hint">Tap a chip or pick dates. Price fills in here.</p>
      )}

      {days > 0 ? (
        <>
          <p className="field-label">Handover</p>
          <div className="ld-hand" role="group" aria-label="Handover type">
            <button type="button" className={handover === 'pickup' ? 'is-on' : ''} onClick={() => setHandover('pickup')} aria-pressed={handover === 'pickup'}>Pickup</button>
            <button type="button" className={handover === 'delivery' ? 'is-on' : ''} onClick={() => setHandover('delivery')} aria-pressed={handover === 'delivery'}>Delivery</button>
          </div>
          {handover === 'delivery' ? (
            <div>
              <label className="field-label" htmlFor={`book-addr-${uid}`}>Delivery address</label>
              <input
                id={`book-addr-${uid}`}
                className="input-dark"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Area, landmark, pin"
                aria-label="Delivery address"
              />
            </div>
          ) : null}

          <div className="coupon-box">
            <label className="field-label" htmlFor={`booking-coupon-${uid}`}>Coupon code</label>
            {appliedCoupon ? (
              <div className="coupon-applied">
                <span>{appliedCoupon.code} saved ₹{discount}</span>
                <button type="button" className="coupon-clear" onClick={clearCoupon} aria-label="Remove coupon">Remove</button>
              </div>
            ) : (
              <div className="coupon-row">
                <input
                  id={`booking-coupon-${uid}`}
                  className="input-dark"
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value)}
                  placeholder="WELCOME10"
                  aria-label="Coupon code"
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); applyCoupon() } }}
                />
                <button type="button" className="btn-outline coupon-apply-btn" onClick={applyCoupon} disabled={couponBusy} aria-label="Apply coupon">
                  {couponBusy ? '…' : 'Apply'}
                </button>
              </div>
            )}
            <AvailableCoupons
              coupons={openCoupons}
              subtotal={subtotal}
              selectedId={appliedCoupon?.id}
              onPick={tryApplyCoupon}
              userId={user?.id}
            />
          </div>

          {payMethods.length > 0 ? (
            <PaymentOptions
              methods={payMethods}
              selectedId={selectedPay?.id}
              onSelect={setPayMethodId}
              paymentRef={paymentRef}
              onPaymentRef={setPaymentRef}
            />
          ) : null}

          <div className="book-damage">
            <strong>Damage policy (short)</strong>
            <p>Wear is free. Scratches come from deposit. Smash / water / loss = used-market value. Photos at pickup and return.</p>
          </div>
          <div className="book-terms">
            <input
              id={`accept-terms-${uid}`}
              type="checkbox"
              checked={acceptTerms}
              onChange={(e) => setAcceptTerms(e.target.checked)}
              aria-label="Accept terms and damage policy"
            />
            <label htmlFor={`accept-terms-${uid}`}>
              I accept the{' '}
              <Link to="/terms" target="_blank" rel="noreferrer">Terms &amp; Damage Policy</Link>
              {' '}before renting.
            </label>
          </div>
        </>
      ) : null}

      {payError ? (
        <div className="ld-err">
          <AlertCircle size={14} />
          <span>{payError}</span>
          <button type="button" onClick={() => setPayError('')} aria-label="Dismiss error"><X size={12} /></button>
        </div>
      ) : null}

      <button
        type="button"
        onClick={handleBook}
        disabled={isProcessing || outOfStock || (isAuthenticated && days > 0 && !acceptTerms)}
        className="btn-primary w-full"
        aria-label="Rent this item now"
      >
        {isProcessing ? (saving ? 'Confirming…' : 'Opening payment…') : null}
        {!isProcessing && !isAuthenticated ? <><CreditCard size={16} /> Sign in to rent</> : null}
        {!isProcessing && isAuthenticated && outOfStock ? 'Out of stock' : null}
        {!isProcessing && isAuthenticated && !outOfStock && days < 1 ? <><Calendar size={16} /> Pick dates to rent</> : null}
        {!isProcessing && isAuthenticated && !outOfStock && days > 0 ? <><CreditCard size={16} /> Rent now · {payButtonLabel(selectedPay, total)}</> : null}
      </button>

      <div className="ld-trust">
        <span><Shield size={10} /> Deposit held</span>
        <span><CheckCircle size={10} /> Secure pay</span>
      </div>
    </div>
  )

  if (mobile) {
    return (
      <>
        <div className="flex items-center gap-3">
          <div className="ld-bar-price flex-1 min-w-0">
            <strong>{days > 0 ? `₹${total}` : `₹${listing.price_day}`}</strong>
            <span>{days > 0 ? `${days} day${days === 1 ? '' : 's'} incl. deposit` : '/day · tap to rent'}</span>
          </div>
          <button
            type="button"
            className="btn-primary"
            onClick={() => (isAuthenticated ? setSheetOpen(true) : navigate('/login', { state: { from: { pathname: `/listing/${listing.id}?rent=1` } } }))}
            aria-label={isAuthenticated ? 'Open rent form' : 'Sign in to rent'}
            disabled={outOfStock}
          >
            {outOfStock ? 'Out of stock' : 'Rent now'}
          </button>
        </div>
        {sheetOpen ? createPortal(
          <>
            <button type="button" className="listing-sheet-backdrop" aria-label="Close rent form" onClick={() => setSheetOpen(false)} />
            <div className="listing-sheet" role="dialog" aria-modal="true" aria-label="Rent this listing">
              <div className="listing-sheet__head">
                <p>Rent this gear</p>
                <button type="button" className="btn-outline" onClick={() => setSheetOpen(false)} aria-label="Close rent form">
                  <X size={16} /> Close
                </button>
              </div>
              {formCard}
            </div>
          </>,
          document.body
        ) : null}
      </>
    )
  }

  return formCard
}

export default function ListingDetail() {
  const { id } = useParams()
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const { listing, loading, error } = useListingById(id)
  const { user, isAdmin } = useAuth()
  const { showToast } = useToast()
  const [saved, setSaved] = useState(false)
  const [reviews, setReviews] = useState([])
  const [similar, setSimilar] = useState([])
  const [panel, setPanel] = useState('about')
  const [howStep, setHowStep] = useState(0)
  const wantRent = params.get('rent') === '1'

  useEffect(() => {
    if (!id) return
    setSaved(readSaved().includes(id))
  }, [id])

  useEffect(() => {
    if (!id) return
    supabase
      .from('reviews')
      .select('*, reviewer:profiles!reviewer_id(full_name, avatar_url)')
      .eq('listing_id', id)
      .or('is_hidden.eq.false,is_hidden.is.null')
      .order('created_at', { ascending: false })
      .then(({ data }) => setReviews(data || []))
  }, [id])

  useEffect(() => {
    if (!listing) return
    supabase
      .from('listings')
      .select('*, profiles(full_name, rating, kyc_status)')
      .eq('category', listing.category)
      .eq('is_available', true)
      .eq('is_published', true)
      .neq('id', listing.id)
      .limit(3)
      .then(({ data }) => setSimilar(data || []))
  }, [listing])

  useEffect(() => {
    if (!wantRent || !listing) return
    const desktop = window.matchMedia('(min-width: 1024px)').matches
    if (desktop) {
      document.getElementById('rent-now')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
    const next = new URLSearchParams(params)
    next.delete('rent')
    setParams(next, { replace: true })
  }, [wantRent, listing, params, setParams])

  const toggleSave = () => {
    const next = saved
      ? readSaved().filter((row) => row !== id)
      : [...readSaved(), id]
    localStorage.setItem(SAVED_KEY, JSON.stringify(next))
    setSaved(!saved)
    showToast(saved ? 'Removed from saved' : 'Saved for later', 'success')
  }

  const handleShare = async () => {
    const url = window.location.href.replace(/\?rent=1/, '')
    try {
      if (navigator.share) {
        await navigator.share({ title: listing?.title, url })
        return
      }
      await navigator.clipboard.writeText(url)
      showToast('Link copied', 'success')
    } catch {
      showToast('Share cancelled', 'info')
    }
  }

  const isGaming = listing?.category === 'gaming'
  const canViewHidden = isAdmin || user?.id === listing?.user_id
  const isHiddenFromPublic = listing && listing.is_published === false && !canViewHidden
  const stock = listing?.stock_qty ?? 1

  if (loading) {
    return (
      <div className={`ld${isGaming === false ? ' is-music' : ''}`}>
        <div className="grid-floor" />
        <GameBackground />
        <div className="ld-wrap"><div className="ld-skel" /></div>
      </div>
    )
  }

  if (error || !listing || isHiddenFromPublic) {
    return (
      <div className="ld">
        <div className="grid-floor" />
        <GameBackground />
        <div className="ld-miss">
          <h2 className="font-bungee text-white text-2xl mb-3">Listing not found</h2>
          <button type="button" onClick={() => navigate('/browse')} className="btn-primary" aria-label="Browse listings">
            Browse listings
          </button>
        </div>
      </div>
    )
  }

  const lister = listing.profiles
  const applyPriceChip = (kind) => {
    const el = document.getElementById('rent-now')
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    window.dispatchEvent(new CustomEvent('ld-quick-date', { detail: kind }))
  }

  return (
    <div className={`ld${isGaming ? ' is-gaming' : ' is-music'}`}>
      <div className="grid-floor" />
      <GameBackground />

      <div className="ld-wrap">
        <div className="ld-top">
          <button type="button" className="ld-back" onClick={() => navigate(-1)} aria-label="Go back">
            <ArrowLeft size={16} /> Back
          </button>
          <div className="ld-icon-row">
            <button type="button" className={`ld-icon-btn${saved ? ' is-on' : ''}`} onClick={toggleSave} aria-label={saved ? 'Unsave listing' : 'Save listing'}>
              <Heart size={16} fill={saved ? 'currentColor' : 'none'} />
            </button>
            <button type="button" className="ld-icon-btn" onClick={handleShare} aria-label="Share listing">
              <Share2 size={16} />
            </button>
          </div>
        </div>

        <div className="ld-grid">
          <div className="ld-main">
            <PhotoGallery photos={listing.photos} emoji={listing.emoji} title={listing.title} />

            <div className="ld-pills">
              <span className={isGaming ? 'tag-gaming' : 'tag-music'}>
                {isGaming ? '🎮' : '🎵'} {listing.subcategory}
              </span>
              {listing.condition ? <span className="ld-pill">{conditionLabel(listing.condition)}</span> : null}
              {listing.is_available && stock > 0 ? (
                <span className="ld-pill is-ok">Available{stock <= 1 ? ' · last one' : ` · ${stock} left`}</span>
              ) : (
                <span className="ld-pill is-bad">Booked out</span>
              )}
              {listing.deposit_amount ? <span className="ld-pill is-warn">Deposit ₹{listing.deposit_amount}</span> : null}
            </div>

            <h1>{listing.title}</h1>
            <div className="ld-meta">
              {listing.rating > 0 ? (
                <span className="is-gold">
                  <Star size={14} /> {listing.rating} ({listing.total_reviews} reviews)
                </span>
              ) : null}
              <span><MapPin size={14} /> {listing.location}, Bangalore</span>
            </div>

            <div className="ld-prices">
              {[
                { key: 'tonight', label: 'Per Day', price: listing.price_day, tone: '' },
                { key: 'weekend', label: 'Weekend', price: listing.price_weekend, tone: 'is-gold' },
                { key: 'week', label: 'Per Week', price: listing.price_week, tone: 'is-green' },
              ].filter((row) => row.price).map((row) => (
                <button
                  key={row.key}
                  type="button"
                  className={`ld-price ${row.tone}`}
                  onClick={() => applyPriceChip(row.key)}
                  aria-label={`Rent ${row.label.toLowerCase()} for ₹${row.price}`}
                >
                  <strong>₹{row.price}</strong>
                  <span>{row.label} · tap to fill dates</span>
                </button>
              ))}
            </div>

            <div className="ld-tabs" role="tablist" aria-label="Listing sections">
              {[
                { id: 'about', label: 'About' },
                { id: 'specs', label: 'Details' },
                { id: 'howto', label: 'How rent works' },
                { id: 'reviews', label: `Reviews (${reviews.length})` },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  className={`ld-tab${panel === tab.id ? ' is-on' : ''}`}
                  aria-selected={panel === tab.id}
                  onClick={() => setPanel(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {panel === 'about' ? (
              <div className="ld-card">
                <h3>ABOUT THIS ITEM</h3>
                <p>{listing.description || 'No write-up yet. Ask the lister on handover.'}</p>
              </div>
            ) : null}

            {panel === 'specs' ? (
              <div className="ld-card">
                <h3>ITEM DETAILS</h3>
                <div className="ld-specs">
                  {[
                    ['Category', isGaming ? 'Gaming' : 'Music'],
                    ['Type', listing.subcategory],
                    ['Brand', listing.brand || '—'],
                    ['Model', listing.model || '—'],
                    ['Condition', conditionLabel(listing.condition)],
                    ['Deposit', `₹${listing.deposit_amount || 5000}`],
                    ['Stock', `${listing.stock_qty ?? 1} / ${listing.stock_total ?? listing.stock_qty ?? 1}`],
                    ['Area', listing.location || 'Bangalore'],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <span>{label.toUpperCase()}</span>
                      <b>{value}</b>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {panel === 'howto' ? (
              <div className="ld-card">
                <h3>HOW RENT WORKS</h3>
                <div className="ld-how">
                  {HOW_STEPS.map((item, i) => (
                    <button
                      key={item.title}
                      type="button"
                      className={howStep === i ? 'is-on' : ''}
                      onClick={() => setHowStep(i)}
                      aria-pressed={howStep === i}
                    >
                      <b>{i + 1}</b>
                      <span>
                        <strong>{item.title}</strong>
                        <span>{item.body}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {panel === 'reviews' ? (
              <div className="ld-card">
                <h3>REVIEWS</h3>
                {reviews.length === 0 ? (
                  <div className="ld-empty">No reviews yet — be first to rent this.</div>
                ) : (
                  reviews.map((review) => (
                    <div key={review.id} className="ld-review">
                      <div className="ld-review__top">
                        <strong>{review.reviewer?.full_name || 'Renter'}</strong>
                        <em>{'★'.repeat(review.rating || 0)}{'☆'.repeat(5 - (review.rating || 0))}</em>
                      </div>
                      {review.comment ? <p>{review.comment}</p> : null}
                    </div>
                  ))
                )}
              </div>
            ) : null}

            <div className="ld-card">
              <h3>LISTED BY</h3>
              <div className="ld-lister">
                <div className="ld-lister__face">
                  {lister?.avatar_url
                    ? <img src={lister.avatar_url} alt="" />
                    : (lister?.full_name?.[0]?.toUpperCase() || <User size={20} />)}
                </div>
                <div>
                  <strong className="text-white">{lister?.full_name || 'Anonymous'}</strong>
                  {lister?.kyc_status === 'verified' ? (
                    <span className="ld-pill is-ok"><Shield size={11} /> Verified</span>
                  ) : null}
                  <p>Member since {new Date(listing.created_at).getFullYear()}</p>
                </div>
              </div>
            </div>

            {similar.length > 0 ? (
              <div>
                <h3 className="ld-card-title">SIMILAR GEAR</h3>
                <div className="ld-similar">
                  {similar.map((row) => <ListingCard key={row.id} listing={row} />)}
                </div>
              </div>
            ) : null}
          </div>

          <div className="hidden lg:block">
            <BookingWidget listing={listing} forceOpen={wantRent} />
          </div>
        </div>

        <div className="lg:hidden listing-mobile-bar">
          <BookingWidget listing={listing} mobile forceOpen={wantRent} />
        </div>
        <div className="lg:hidden listing-mobile-spacer" />
      </div>
    </div>
  )
}
