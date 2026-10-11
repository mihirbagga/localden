import { Link } from 'react-router-dom'
import { Instagram, Heart, Mail, Phone } from 'lucide-react'
import LogoMark from './LogoMark'
import {
  SUPPORT_EMAIL,
  SUPPORT_MAIL_HREF,
  SUPPORT_PHONE,
  SUPPORT_TEL_HREF,
  INSTAGRAM_HANDLE,
  INSTAGRAM_URL,
} from '../lib/contact'
import '../pages/contact.css'

const footerLinks = {
  Platform: [
    { label: 'Browse Listings',   to: '/browse'       },
    { label: 'Events & Artists',  to: '/live'         },
    { label: 'List Your Gear',    to: '/list-item'    },
    { label: 'How It Works',      to: '/how-it-works' },
    { label: 'Contact Support',   to: '/contact'      },
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
              Bengaluru &amp; Gurugram's P2P rental marketplace for gaming consoles and music instruments.
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

            {/* Official Instagram */}
            <div className="flex items-center gap-3">
              <a
                href={INSTAGRAM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2.5 px-3 py-2 rounded-xl glass hover:border-pink-500/50 hover:bg-pink-500/10 transition-all duration-300 group site-footer__social-ig"
                aria-label={`Follow LocalDen on Instagram (@${INSTAGRAM_HANDLE})`}
              >
                <div className="w-6 h-6 rounded-lg flex items-center justify-center bg-gradient-to-tr from-amber-500 via-pink-500 to-purple-600 text-white shadow-sm group-hover:scale-110 transition-transform">
                  <Instagram size={14} />
                </div>
                <div className="text-left leading-tight">
                  <span className="block text-[9px] uppercase font-mono tracking-wider text-white/50 group-hover:text-pink-300 transition-colors">
                    Instagram
                  </span>
                  <span className="block text-xs font-semibold text-white/90 group-hover:text-white font-mono">
                    @{INSTAGRAM_HANDLE}
                  </span>
                </div>
              </a>
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
            © 2024 लोकल Den · Bengaluru &amp; Gurugram, India · Made with
            <Heart size={11} className="text-pink-500 fill-pink-500" />
            for gamers &amp; musicians
          </p>
          <p className="text-xs font-display"
            style={{ color: 'rgba(255,46,109,0.35)', letterSpacing: '0.1em' }}>
            Gaming · Music · Bengaluru &amp; Gurugram 🇮🇳
          </p>
        </div>
      </div>
    </footer>
  )
}
