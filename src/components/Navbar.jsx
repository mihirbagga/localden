import { useState, useEffect, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  Menu, X, ChevronRight, LogOut, User, Shield, Search,
  PlusCircle, CheckCircle, AlertCircle, Sparkles, Compass, Calendar,
} from 'lucide-react'
import LogoMark from './LogoMark'
import NotificationBell from './NotificationBell'
import NotificationBar from './NotificationBar'
import ThemeToggle from './ThemeToggle'
import { useAuth } from '../contexts/AuthContext'
import './navbar.css'

const navLinks = [
  { to: '/',             label: 'Home'             },
  { to: '/browse',       label: 'Browse Gear'      },
  { to: '/live',         label: 'Events & Artists' },
  { to: '/how-it-works', label: 'How It Works'     },
  { to: '/about',        label: 'About'            },
  { to: '/contact',      label: 'Contact'          },
]

function NavbarAuth() {
  const { isAuthenticated, profile, signOut, isAdmin, kycStatus } = useAuth()
  const [open, setOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    if (!open) return
    function handleOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    function handleKey(e) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleOutside)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleOutside)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open])

  if (isAuthenticated) {
    const kycVerified = kycStatus === 'verified'
    const kycActionNeeded = kycStatus === 'required' || kycStatus === 'rejected'

    return (
      <div className="nav-auth relative" ref={menuRef}>
        <Link to="/list-item" className="btn-primary text-sm py-2 px-4 flex items-center gap-1.5">
          <PlusCircle size={15} />
          <span>List Gear</span>
        </Link>

        {/* Avatar dropdown trigger */}
        <button
          onClick={() => setOpen(!open)}
          className="nav-avatar-btn"
          aria-label="Open account menu"
          aria-expanded={open}
        >
          <span className="nav-avatar-circle">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-full h-full object-cover rounded-full" />
            ) : (
              profile?.full_name?.[0]?.toUpperCase() || <User size={15} />
            )}
          </span>
          {kycActionNeeded && <span className="nav-avatar-dot is-warn" title="Verification required" />}
          {kycVerified && <span className="nav-avatar-dot is-ok" title="KYC Verified" />}
        </button>

        {open && (
          <div className="nav-dropdown glass rounded-2xl p-3 z-50">
            <div className="nav-dropdown__header">
              <p className="font-display font-bold text-sm truncate" style={{ color: 'var(--text)' }}>
                {profile?.full_name || 'Den Member'}
              </p>
              <p className="text-xs truncate" style={{ color: 'var(--text-dim)' }}>
                {profile?.email || ''}
              </p>
              <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                {kycVerified ? (
                  <span className="nav-badge is-ok">
                    <CheckCircle size={11} /> Verified Member
                  </span>
                ) : kycActionNeeded ? (
                  <Link
                    to="/dashboard"
                    onClick={() => setOpen(false)}
                    className="nav-badge is-warn"
                  >
                    <AlertCircle size={11} /> Complete KYC
                  </Link>
                ) : (
                  <span className="nav-badge is-neutral">Standard Account</span>
                )}
                {isAdmin && (
                  <span className="nav-badge is-admin">
                    <Shield size={11} /> Admin
                  </span>
                )}
              </div>
            </div>

            <div className="py-1.5 space-y-0.5">
              <Link
                to="/dashboard"
                onClick={() => setOpen(false)}
                className="nav-dropdown__item"
              >
                <User size={15} />
                <span>My Dashboard & Bookings</span>
              </Link>
              <Link
                to="/list-item"
                onClick={() => setOpen(false)}
                className="nav-dropdown__item"
              >
                <PlusCircle size={15} />
                <span>List New Gear</span>
              </Link>
              <Link
                to="/browse"
                onClick={() => setOpen(false)}
                className="nav-dropdown__item"
              >
                <Compass size={15} />
                <span>Explore Gear Catalog</span>
              </Link>
              {isAdmin && (
                <Link
                  to="/admin"
                  onClick={() => setOpen(false)}
                  className="nav-dropdown__item is-admin-link"
                  aria-label="Open admin panel"
                >
                  <Shield size={15} />
                  <span>Admin Command Center</span>
                </Link>
              )}
            </div>

            <div className="pt-1.5 mt-1" style={{ borderTop: '1px solid var(--border)' }}>
              <button
                onClick={() => { signOut(); setOpen(false) }}
                className="nav-dropdown__item is-danger w-full text-left"
              >
                <LogOut size={15} />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="nav-auth gap-2.5">
      <Link to="/list-item" className="nav-link hidden xl:inline-flex items-center gap-1">
        <Sparkles size={13} style={{ color: 'var(--cyan)' }} />
        List Gear
      </Link>
      <Link to="/login" className="btn-outline text-sm py-2 px-4">
        Sign In
      </Link>
      <Link to="/signup" className="btn-primary text-sm py-2 px-5">
        Join Free
      </Link>
    </div>
  )
}

export default function Navbar() {
  const [open, setOpen]         = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const navRef                  = useRef(null)
  const { pathname }            = useLocation()
  const { isAuthenticated, isAdmin, profile, signOut } = useAuth()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => setOpen(false), [pathname])

  useEffect(() => {
    const el = navRef.current
    if (!el) return
    const update = () => {
      const h = el.offsetHeight || 64
      document.documentElement.style.setProperty('--nav-height', `${h}px`)
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    window.addEventListener('resize', update)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', update)
    }
  }, [])

  return (
    <nav
      ref={navRef}
      className={`nav-bar fixed top-0 inset-x-0 z-50 transition-all duration-300${scrolled ? ' is-scrolled' : ''}`}
      aria-label="Main navigation"
    >
      <NotificationBar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* ── Logo ───────────────────────────────── */}
          <Link to="/" className="flex items-center gap-2.5 group flex-shrink-0">
            <LogoMark size={36} />
            <div className="nav-brand-text">
              <span
                className="font-bungee text-lg leading-none"
                style={{ color: '#ff1666', textShadow: '0 0 14px rgba(255,22,102,0.45)' }}
              >
                लोकल
              </span>
              <span
                className="font-bungee text-lg leading-none"
                style={{ color: '#00e5ff', textShadow: '0 0 12px rgba(0,229,255,0.55)' }}
              >
                &nbsp;Den
              </span>
            </div>
          </Link>

          {/* ── Desktop Links ──────────────────────── */}
          <div className="nav-links">
            {navLinks.map(({ to, label }) => {
              const active = pathname === to || (to !== '/' && pathname.startsWith(to))
              return (
                <Link
                  key={to}
                  to={to}
                  className={`nav-link${active ? ' is-on' : ''}`}
                  aria-current={active ? 'page' : undefined}
                >
                  {label}
                </Link>
              )
            })}
            {isAdmin && (
              <Link
                to="/admin"
                className={`nav-link is-admin-pill${pathname.startsWith('/admin') ? ' is-on' : ''}`}
              >
                <Shield size={13} />
                <span>Admin</span>
              </Link>
            )}
          </div>

          {/* ── Right Actions ──────────────────────── */}
          <div className="nav-tools">
            <Link
              to="/browse"
              className="nav-search-pill"
              aria-label="Search gear catalog"
              title="Search PS5, cameras, DJ rigs & more"
            >
              <Search size={15} />
              <span className="nav-search-pill__text">Search gear…</span>
            </Link>
            <ThemeToggle />
            {isAuthenticated ? <NotificationBell /> : null}
            <NavbarAuth />
            <button
              className="nav-toggle"
              onClick={() => setOpen(!open)}
              aria-label={open ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={open}
            >
              {open ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </div>

      {/* ── Mobile / Tablet Drawer ─────────────────── */}
      <div className={`nav-drawer${open ? ' is-open' : ''}`}>
        <div className="px-4 pb-5 pt-3 space-y-1.5 nav-drawer__inner">
          {isAuthenticated && (
            <div className="nav-drawer__profile mb-2">
              <div className="flex items-center gap-3">
                <div className="nav-avatar-circle">
                  {profile?.full_name?.[0]?.toUpperCase() || <User size={15} />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-display font-bold text-sm truncate" style={{ color: 'var(--text)' }}>
                    {profile?.full_name || 'Den Member'}
                  </p>
                  <p className="text-xs truncate" style={{ color: 'var(--text-dim)' }}>
                    {profile?.email}
                  </p>
                </div>
              </div>
            </div>
          )}

          {navLinks.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              className={`nav-drawer__link${pathname === to ? ' is-on' : ''}`}
            >
              <span>{label}</span>
              <ChevronRight size={15} style={{ opacity: 0.45 }} />
            </Link>
          ))}

          {isAuthenticated ? (
            <>
              <Link
                to="/dashboard"
                className={`nav-drawer__link${pathname === '/dashboard' ? ' is-on' : ''}`}
              >
                <span className="flex items-center gap-2">
                  <Calendar size={15} style={{ color: 'var(--cyan)' }} />
                  My Dashboard & Bookings
                </span>
                <ChevronRight size={15} style={{ opacity: 0.45 }} />
              </Link>
              {isAdmin && (
                <Link
                  to="/admin"
                  className={`nav-drawer__link${pathname === '/admin' ? ' is-on' : ''}`}
                  aria-label="Open admin panel"
                >
                  <span className="flex items-center gap-2" style={{ color: 'var(--gold)' }}>
                    <Shield size={15} />
                    Admin Command Center
                  </span>
                  <ChevronRight size={15} style={{ opacity: 0.45 }} />
                </Link>
              )}
            </>
          ) : (
            <div className="grid grid-cols-2 gap-2 pt-2">
              <Link to="/login" className="btn-outline text-sm py-2.5 text-center">
                Sign In
              </Link>
              <Link to="/signup" className="btn-primary text-sm py-2.5 text-center">
                Join Free
              </Link>
            </div>
          )}

          <div className="pt-2 flex flex-col gap-2">
            <Link
              to="/list-item"
              className="btn-primary w-full text-sm py-3 text-center flex items-center justify-center gap-1.5"
              onClick={() => setOpen(false)}
              aria-label="List your gear"
            >
              <PlusCircle size={16} />
              <span>List Your Gear & Earn</span>
            </Link>
            {isAuthenticated && (
              <button
                type="button"
                onClick={() => { signOut(); setOpen(false) }}
                className="w-full py-2.5 rounded-xl text-xs font-display font-bold uppercase tracking-wider transition-colors hover:bg-red-500/10"
                style={{ color: '#ff6b9d', border: '1px solid rgba(255,46,109,0.2)' }}
              >
                Sign Out
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
