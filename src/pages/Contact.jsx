import { Mail, Phone, MessageCircle } from 'lucide-react'
import GameBackground from '../components/GameBackground'
import { useToast } from '../contexts/ToastContext'
import {
  SUPPORT_EMAIL,
  SUPPORT_MAIL_HREF,
  SUPPORT_PHONE,
  SUPPORT_TEL_HREF,
  SUPPORT_WHATSAPP_HREF,
} from '../lib/contact'
import './contact.css'

async function copyText(text) {
  await navigator.clipboard.writeText(text)
}

export default function Contact() {
  const { showToast } = useToast()

  const copy = async (label, value) => {
    try {
      await copyText(value)
      showToast(`${label} copied`, 'success')
    } catch {
      showToast('Copy failed', 'error')
    }
  }

  return (
    <div className="contact-page">
      <div className="grid-floor" />
      <GameBackground />

      <div className="contact-wrap">
        <header className="contact-head">
          <p className="section-label mb-3">We are here</p>
          <h1 className="contact-title">
            Contact <span className="gradient-text">Support</span>
          </h1>
          <p className="contact-lead">
            Booking, payment, or listing issue? Call, WhatsApp, or email लोकल Den.
          </p>
        </header>

        <div className="contact-cards">
          <div className="contact-card contact-card--phone">
            <div className="contact-card__icon" aria-hidden="true">
              <Phone size={18} />
            </div>
            <div className="contact-card__body">
              <p className="contact-card__label">Support phone</p>
              <a className="contact-card__value" href={SUPPORT_TEL_HREF} aria-label={`Call ${SUPPORT_PHONE}`}>
                {SUPPORT_PHONE}
              </a>
            </div>
            <div className="contact-card__actions">
              <a className="btn-primary" href={SUPPORT_TEL_HREF} aria-label={`Call ${SUPPORT_PHONE}`}>
                Call
              </a>
              <a
                className="btn-outline"
                href={SUPPORT_WHATSAPP_HREF}
                target="_blank"
                rel="noreferrer"
                aria-label={`WhatsApp ${SUPPORT_PHONE}`}
              >
                <MessageCircle size={14} aria-hidden="true" />
                WhatsApp
              </a>
              <button
                type="button"
                className="btn-outline"
                onClick={() => copy('Phone', SUPPORT_PHONE)}
                aria-label="Copy support phone"
              >
                Copy
              </button>
            </div>
          </div>

          <div className="contact-card contact-card--mail">
            <div className="contact-card__icon" aria-hidden="true">
              <Mail size={18} />
            </div>
            <div className="contact-card__body">
              <p className="contact-card__label">Support email</p>
              <a className="contact-card__value" href={SUPPORT_MAIL_HREF} aria-label={`Email ${SUPPORT_EMAIL}`}>
                {SUPPORT_EMAIL}
              </a>
            </div>
            <div className="contact-card__actions">
              <a className="btn-primary" href={SUPPORT_MAIL_HREF} aria-label={`Email ${SUPPORT_EMAIL}`}>
                Email
              </a>
              <button
                type="button"
                className="btn-outline"
                onClick={() => copy('Email', SUPPORT_EMAIL)}
                aria-label="Copy support email"
              >
                Copy
              </button>
            </div>
          </div>
        </div>

        <p className="contact-note">
          Share booking ID or listing name when you write. Typical reply during India business hours.
        </p>
      </div>
    </div>
  )
}
