import { NavLink, useLocation } from 'react-router-dom'
import { Home, Search, Music2, LayoutDashboard, LogIn } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import './bottomNav.css'

/* Mobile/tablet bottom tab bar. Desktop (≥1080px) uses the top navbar. */
export default function BottomNav() {
  const { isAuthenticated } = useAuth()
  const { pathname } = useLocation()

  if (pathname.startsWith('/admin')) return null

  const tabs = [
    { to: '/',        label: 'Home',   Icon: Home, end: true },
    { to: '/browse',  label: 'Browse', Icon: Search },
    { to: '/live',    label: 'Events', Icon: Music2 },
    isAuthenticated
      ? { to: '/dashboard', label: 'Account', Icon: LayoutDashboard }
      : { to: '/login',     label: 'Log in',  Icon: LogIn },
  ]

  return (
    <nav className="bottom-nav" aria-label="Quick navigation">
      {tabs.map(({ to, label, Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) => `bottom-nav__tab${isActive ? ' is-on' : ''}`}
        >
          <Icon size={20} strokeWidth={2.2} />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
