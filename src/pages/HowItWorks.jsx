import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import GameBackground from '../components/GameBackground'
import { usePlatformFee } from '../hooks/usePlatformFee'
import { platformFeeCopy, platformFeeFaq } from '../lib/platformFee'
import { SUPPORT_EMAIL, SUPPORT_PHONE } from '../lib/contact'
import './howItWorks.css'

const RENTER_STEPS = [
  {
    emoji: '🔍',
    title: 'Browse & search',
    desc: 'Filter Gaming or Music, Bangalore area, price, and dates. Find the exact console, guitar, or kit you need.',
  },
  {
    emoji: '🪪',
    title: 'Quick KYC',
    desc: 'First rental: Aadhaar/PAN + selfie. About 2 minutes. Listers see a verified renter, not a stranger.',
  },
  {
    emoji: '📅',
    title: 'Book & pay',
    desc: 'Grey dates on the calendar are taken. Apply a coupon, then UPI / QR / Razorpay / cash. Deposit sits until return.',
  },
  {
    emoji: '🚚',
    title: 'Pickup or delivery',
    desc: 'Meet the lister or get it dropped. Check-in photos at handover, check-out at return. Alerts ping you the day before.',
  },
  {
    emoji: '⭐',
    title: 'Rate & repeat',
    desc: 'Leave a review. Deposit comes back after a clean return. Better rating = easier next booking.',
  },
]

const LISTER_STEPS = [
  {
    emoji: '📝',
    title: 'List your gear',
    desc: 'Photos, daily price, area, stock. Under 5 minutes. No listing fee.',
  },
  {
    emoji: '🔐',
    title: 'We check renters',
    desc: 'KYC before first booking. You see name, history, and ratings before you hand anything over.',
  },
  {
    emoji: '📬',
    title: 'Accept the booking',
    desc: 'Bell + WhatsApp when someone books. Accept or decline. Deposit is collected up front so the item is covered.',
  },
  {
    emoji: '🤝',
    title: 'Handover',
    desc: 'Meet or deliver. Both sides add check-in photos. Check-out photos when it comes back.',
  },
  {
    emoji: '💸',
    title: 'Get paid',
    desc: '',
  },
]

const TRUST = [
  {
    title: 'Security deposit',
    desc: 'Deposit held on the booking. Released after a safe return, or used if something is damaged.',
  },
  {
    title: 'Check-in photos',
    desc: 'Pickup and return photos live on the booking. Grey calendar dates stay blocked so two people cannot take the same weekend.',
  },
  {
    title: 'Verified people',
    desc: 'KYC on first rental. No anonymous bookings. Reviews both ways after every trip.',
  },
  {
    title: 'Payment options',
    desc: 'QR, UPI, bank, cash, or Razorpay — whatever admin enables. You pick at checkout.',
  },
  {
    title: 'Human support',
    desc: `Stuck? Call or WhatsApp ${SUPPORT_PHONE}, or email ${SUPPORT_EMAIL}.`,
  },
]

export default function HowItWorks() {
  const { fee } = usePlatformFee()
  const [role, setRole] = useState('renter')
  const [step, setStep] = useState(0)
  const [openTrust, setOpenTrust] = useState(0)
  const [openFaq, setOpenFaq] = useState(0)

  const steps = useMemo(() => {
    const paid = {
      ...LISTER_STEPS[4],
      desc: `${platformFeeCopy(fee)} Paid after a confirmed return.`,
    }
    return role === 'renter' ? RENTER_STEPS : [...LISTER_STEPS.slice(0, 4), paid]
  }, [role, fee])

  const faqs = useMemo(() => ([
    { q: 'What if the item gets damaged?', a: 'Check-in and check-out photos sit on the booking. Deposit covers damage beyond wear. Tell us within 24 hours of return.' },
    { q: 'Why are some calendar dates grey?', a: 'Those days are already booked. The same unit cannot go to two people on overlapping dates.' },
    { q: 'How long does KYC take?', a: 'Usually under 2 minutes. Upload Aadhaar/PAN and a selfie. Auto or manual review within an hour.' },
    { q: 'Can I list more than one item?', a: 'Yes. Each listing has its own photos, price, and stock. No listing fee.' },
    { q: 'How is the platform fee calculated?', a: platformFeeFaq(fee) },
    { q: 'What areas are covered?', a: 'Bangalore first: Koramangala, Indiranagar, HSR, Whitefield, BTM, Marathahalli, Electronic City, Jayanagar, Sadashivanagar, Malleshwaram, Hebbal. More soon.' },
    { q: 'How do I contact support?', a: `Call or WhatsApp ${SUPPORT_PHONE}, or email ${SUPPORT_EMAIL}.` },
  ]), [fee])

  const current = steps[step]
  const isLister = role === 'lister'

  const pickRole = (next) => {
    setRole(next)
    setStep(0)
  }

  return (
    <div className="hiw-page">
      <div className="grid-floor" />
      <GameBackground />

      <div className="hiw-wrap">
        <header className="hiw-head">
          <p className="section-label mb-3">Simple process</p>
          <h1 className="hiw-title">
            How It <span className="gradient-text">Works</span>
          </h1>
          <p className="hiw-lead">
            Pick a path. Tap each step. Rent gear for a weekend — or earn from the stuff already in your cupboard.
          </p>
        </header>

        <div className="hiw-paths" role="tablist" aria-label="Choose your path">
          <button
            type="button"
            className={`hiw-path is-renter${role === 'renter' ? ' is-on' : ''}`}
            role="tab"
            aria-selected={role === 'renter'}
            aria-controls="hiw-panel"
            id="hiw-tab-renter"
            onClick={() => pickRole('renter')}
          >
            <strong>🎮 I want to rent</strong>
            <span>Browse, book, play, return</span>
          </button>
          <button
            type="button"
            className={`hiw-path is-lister${role === 'lister' ? ' is-on' : ''}`}
            role="tab"
            aria-selected={role === 'lister'}
            aria-controls="hiw-panel"
            id="hiw-tab-lister"
            onClick={() => pickRole('lister')}
          >
            <strong>💰 I want to earn</strong>
            <span>List, accept, handover, get paid</span>
          </button>
        </div>

        <div
          id="hiw-panel"
          role="tabpanel"
          aria-labelledby={role === 'renter' ? 'hiw-tab-renter' : 'hiw-tab-lister'}
        >
          <div className={`hiw-dots${isLister ? ' is-lister' : ''}`} role="group" aria-label="Journey steps">
            {steps.map((item, i) => (
              <button
                key={item.title}
                type="button"
                className={`hiw-dot${step === i ? ' is-on' : ''}`}
                onClick={() => setStep(i)}
                aria-label={`Step ${i + 1}: ${item.title}`}
                aria-current={step === i ? 'step' : undefined}
              >
                {String(i + 1).padStart(2, '0')}
              </button>
            ))}
          </div>

          <div
            className={`hiw-progress${isLister ? ' is-lister' : ''}`}
            role="progressbar"
            aria-valuemin={1}
            aria-valuemax={steps.length}
            aria-valuenow={step + 1}
            aria-label="Journey progress"
          >
            <div className={`hiw-progress__bar is-${step + 1}`} />
          </div>

          <div className={`hiw-stage${isLister ? ' is-lister' : ''}`}>
            <p className="hiw-stage__num">
              STEP {String(step + 1).padStart(2, '0')} / {String(steps.length).padStart(2, '0')}
            </p>
            <h2>{current.emoji} {current.title}</h2>
            <p>{current.desc}</p>
          </div>

          <div className="hiw-nav">
            <button
              type="button"
              className="btn-outline"
              disabled={step === 0}
              onClick={() => setStep((n) => Math.max(0, n - 1))}
              aria-label="Previous step"
            >
              ← Back
            </button>
            {step < steps.length - 1 ? (
              <button
                type="button"
                className="btn-primary"
                onClick={() => setStep((n) => Math.min(steps.length - 1, n + 1))}
                aria-label="Next step"
              >
                Next →
              </button>
            ) : (
              <Link
                to={isLister ? '/list-item' : '/browse'}
                className="btn-primary"
                aria-label={isLister ? 'Start listing gear' : 'Start browsing gear'}
              >
                {isLister ? 'List gear →' : 'Browse gear →'}
              </Link>
            )}
          </div>
        </div>

        <h2 className="hiw-block-title">Trust &amp; safety</h2>
        <div className="hiw-trust">
          {TRUST.map((item, i) => (
            <button
              key={item.title}
              type="button"
              className={`hiw-trust-card${openTrust === i ? ' is-on' : ''}`}
              onClick={() => setOpenTrust(openTrust === i ? -1 : i)}
              aria-expanded={openTrust === i}
              aria-label={`${item.title}. ${openTrust === i ? 'Hide' : 'Show'} details`}
            >
              <h3>{item.title}</h3>
              <p>{item.desc}</p>
            </button>
          ))}
        </div>

        <h2 className="hiw-block-title">FAQ</h2>
        <div className="hiw-faq">
          {faqs.map((item, i) => {
            const open = openFaq === i
            return (
              <div key={item.q} className="hiw-faq-item">
                <button
                  type="button"
                  className="hiw-faq-q"
                  onClick={() => setOpenFaq(open ? -1 : i)}
                  aria-expanded={open}
                  aria-controls={`hiw-faq-${i}`}
                  id={`hiw-faq-btn-${i}`}
                >
                  {item.q}
                  <span aria-hidden="true">{open ? '−' : '+'}</span>
                </button>
                {open ? (
                  <p className="hiw-faq-a" id={`hiw-faq-${i}`} role="region" aria-labelledby={`hiw-faq-btn-${i}`}>
                    {item.a}
                  </p>
                ) : null}
              </div>
            )
          })}
        </div>

        <div className="hiw-cta">
          <h2>Ready?</h2>
          <p>
            {isLister
              ? 'That idle PS5 or guitar can pay for itself.'
              : 'Weekend session. One song. Full squad night. Rent it.'}
          </p>
          <div className="hiw-cta__actions">
            <Link to="/browse" className="btn-primary" aria-label="Browse gear">Browse Gear</Link>
            <Link to="/list-item" className="btn-secondary" aria-label="List your gear">List Your Gear</Link>
            <Link to="/contact" className="btn-outline" aria-label="Contact support">Contact Support</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
