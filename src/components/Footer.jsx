import { Link } from 'react-router-dom'
import { Instagram, Twitter, Youtube, Heart, Mail, Phone } from 'lucide-react'
import LogoMark from './LogoMark'
import {
  SUPPORT_EMAIL,
  SUPPORT_MAIL_HREF,
  SUPPORT_PHONE,
  SUPPORT_TEL_HREF,
} from '../lib/contact'
import '../pages/contact.css'

const footerLinks = {
  Platform: [
    { label: 'Browse Listings', to: '/browse'       },
    { label: 'List Your Gear',  to: '/list-item'    },
    { label: 'How It Works',    to: '/how-it-works' },
    { label: 'Contact Support', to: '/contact'      },
  ],
  Categories: [
    { label: '🎮 Gaming Consoles',   to: '/browse?cat=gaming'         },
    { label: '🎸 Music Instruments', to: '/browse?cat=music'          },
    { label: '🥽 VR Headsets',       to: '/browse?cat=gaming&sub=vr'  },
    { label: '🎹 Keyboards & Synths',to: '/browse?cat=music&sub=keyboard' },
  ],
  Company: [
    { label: 'About Us',       to: '/about' },
    { label: 'Trust & Safety', to: '/how-it-works' },
    { label: 'Contact Support', to: '/contact' },
    { label: 'Terms & Damage', to: '/terms' },
    { label: 'Privacy Policy', to: '/terms' },
  ],
}

export default function Footer() {
  return (
    <footer className="relative z-10 mt-20 site-footer">

      {/* Top neon divider */}
      <div className="neon-divider" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-12">

          {/* ── Brand ──────────────────────────────── */}
          <div className="md:col-span-2">
            <Link to="/" className="flex items-center gap-2.5 mb-5">
              <LogoMark size={40} />
              <div className="flex items-baseline">
                <span className="font-bungee text-xl"
                  style={{ color: '#ff2e6d', textShadow: '0 0 12px rgba(255,46,109,0.5)' }}>
                  लोकल
                </span>
                <span className="font-bungee text-xl"
                  style={{ color: '#00e5ff', textShadow: '0 0 12px rgba(0,229,255,0.5)' }}>
                  &nbsp;Den
                </span>
              </div>
            </Link>

            <p className="text-sm leading-relaxed mb-5 font-display site-footer__copy"
              style={{ lineHeight: 1.8 }}>
              Bangalore's first P2P rental marketplace for gaming consoles and music instruments.
              Rent from real people. Earn from your gear.
            </p>

            <div className="footer-contact">
              <a href={SUPPORT_TEL_HREF} aria-label={`Call ${SUPPORT_PHONE}`}>
                <Phone size={14} aria-hidden="true" />
                {SUPPORT_PHONE}
              </a>
              <a href={SUPPORT_MAIL_HREF} aria-label={`Email ${SUPPORT_EMAIL}`}>
                <Mail size={14} aria-hidden="true" />
                {SUPPORT_EMAIL}
              </a>
            </div>

            <div className="flex items-center gap-2 mb-6">
              <span className="tag-gaming flex items-center gap-1">
                🎮 Gaming
              </span>
              <span className="tag-music flex items-center gap-1">
                🎵 Music
              </span>
            </div>

            {/* Socials */}
            <div className="flex items-center gap-3">
              {[Instagram, Twitter, Youtube].map((Icon, i) => (
                <a key={i} href="#"
                  className="w-9 h-9 rounded-xl glass flex items-center justify-center transition-all duration-300 hover:scale-110 site-footer__social">
                  <Icon size={16} />
                </a>
              ))}
            </div>
          </div>

          {/* ── Links ──────────────────────────────── */}
          {Object.entries(footerLinks).map(([section, links]) => (
            <div key={section}>
              <h4 className="font-bungee text-sm mb-4 tracking-wide"
                style={{ color: '#ff2e6d', fontSize: '0.8rem' }}>
                {section}
              </h4>
              <ul className="space-y-2.5">
                {links.map(({ label, to }) => (
                  <li key={label}>
                    <Link to={to}
                      className="text-sm font-display transition-colors duration-200 site-footer__link"
                      style={{ letterSpacing: '0.02em' }}>
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* ── Bottom bar ─────────────────────────── */}
        <div className="mt-12 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 site-footer__bottom">
          <p className="text-xs font-display flex items-center gap-1.5 site-footer__copy"
            style={{ letterSpacing: '0.05em' }}>
            © 2024 लोकल Den · Bangalore, India · Made with
            <Heart size={11} className="text-pink-500 fill-pink-500" />
            for gamers &amp; musicians
          </p>
          <p className="text-xs font-display"
            style={{ color: 'rgba(255,46,109,0.35)', letterSpacing: '0.1em' }}>
            Gaming · Music · Bangalore 🇮🇳
          </p>
        </div>
      </div>
    </footer>
  )
}
