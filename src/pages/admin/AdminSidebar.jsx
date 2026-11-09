import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  LayoutDashboard, Calendar, Package, Boxes, Truck,
  Users, ShieldCheck, Star, CreditCard, Wallet,
  Tag, MessageSquare, Music, Eye, Settings, Shield,
  ChevronLeft, ChevronRight, Activity, MapPin, Building2,
  ArrowLeft,
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

export const ADMIN_SECTIONS = [
  {
    group: 'DASHBOARD',
    items: [
      { id: 'overview', label: 'Dashboard', icon: LayoutDashboard, path: '' }
    ]
  },
  {
    group: 'OPERATIONS',
    items: [
      { id: 'bookings', label: 'Bookings', icon: Calendar, badgeKey: 'bookings' },
      { id: 'listings', label: 'Gear Listings', icon: Package, badgeKey: 'listings' },
      { id: 'stock', label: 'Inventory', icon: Boxes },
      { id: 'drivers', label: 'Drivers & Hubs', icon: Truck },
      { id: 'cities', label: 'Cities & Regions', icon: MapPin },
      { id: 'hubs', label: 'Hubs & Ops Staff', icon: Building2 }
    ]
  },
  {
    group: 'PEOPLE & TRUST',
    items: [
      { id: 'users', label: 'Users & Roles', icon: Users, badgeKey: 'users' },
      { id: 'kyc', label: 'KYC Verification', icon: ShieldCheck, badgeKey: 'kyc', badgeColor: 'gold' },
      { id: 'reviews', label: 'Reviews & Reports', icon: Star }
    ]
  },
  {
    group: 'FINANCE',
    items: [
      { id: 'payments', label: 'Payments', icon: CreditCard },
      { id: 'payouts', label: 'Payouts', icon: Wallet, badgeKey: 'payouts', badgeColor: 'cyan' }
    ]
  },
  {
    group: 'GROWTH',
    items: [
      { id: 'coupons', label: 'Discounts & Coupons', icon: Tag },
      { id: 'whatsapp', label: 'WhatsApp Alerts', icon: MessageSquare },
      { id: 'live', label: 'Live & Artists', icon: Music }
    ]
  },
  {
    group: 'ANALYTICS',
    items: [
      { id: 'visits', label: 'Traffic Analytics', icon: Eye }
    ]
  }
]

export default function AdminSidebar({
  currentTab,
  onSelectTab,
  counts = {},
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile
}) {
  const { isHubManager, isRegionalAdmin } = useAuth()

  // Filter sections according to permissions
  const filteredSections = useMemo(() => {
    return ADMIN_SECTIONS.map((section) => {
      const items = section.items.filter((item) => {
        if (isHubManager && !['overview', 'bookings', 'hubs', 'drivers'].includes(item.id)) {
          return false
        }
        if (isRegionalAdmin && ['payouts', 'payments'].includes(item.id)) {
          return false
        }
        return true
      })
      return { ...section, items }
    }).filter((section) => section.items.length > 0)
  }, [isHubManager, isRegionalAdmin])

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-35 lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside className={`admin-sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
        {/* Brand/Header */}
        <div className="admin-sidebar-header">
          {!collapsed && (
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#ff2e6d] to-[#00e5ff] flex items-center justify-center font-black text-white text-sm shadow-md shrink-0">
                LD
              </div>
              <div className="min-w-0">
                <span className="font-extrabold text-sm tracking-wide text-white block truncate">Local Den</span>
                <span className="text-[10px] text-white/40 block tracking-wider uppercase font-semibold">Admin Portal v2.0</span>
              </div>
            </div>
          )}

          {collapsed && (
            <div className="w-8 h-8 mx-auto rounded-lg bg-gradient-to-tr from-[#ff2e6d] to-[#00e5ff] flex items-center justify-center font-black text-white text-sm">
              LD
            </div>
          )}

          <button
            type="button"
            onClick={onToggleCollapse}
            className="hidden lg:flex items-center justify-center w-6 h-6 rounded-md bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>

        {/* Navigation items */}
        <div className="admin-sidebar-nav">
          {filteredSections.map((section) => (
            <div key={section.group} className="admin-nav-group">
              {!collapsed && (
                <div className="admin-nav-group-title">
                  {section.group}
                </div>
              )}
              {section.items.map((item) => {
                const Icon = item.icon
                const isActive = currentTab === item.id
                const badgeValue = item.badgeKey ? counts[item.badgeKey] : null

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      onSelectTab(item.id)
                      if (onCloseMobile) onCloseMobile()
                    }}
                    className={`admin-nav-item w-full ${isActive ? 'active' : ''}`}
                    title={collapsed ? item.label : undefined}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Icon size={18} className={`shrink-0 ${isActive ? 'text-[#ff2e6d]' : 'text-white/60'}`} />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </div>

                    {!collapsed && badgeValue > 0 && (
                      <span className={`admin-nav-item-badge ${item.badgeColor || ''}`}>
                        {badgeValue}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          ))}
        </div>

        {/* Exit to Storefront */}
        <div className="p-3 border-t border-white/5 mt-auto">
          <Link
            to="/"
            onClick={onCloseMobile}
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-white/60 hover:text-white hover:bg-white/5 transition-all"
            title="Exit to Storefront"
          >
            <ArrowLeft size={16} className="text-cyan-400 shrink-0" />
            {!collapsed && <span>Storefront</span>}
          </Link>
        </div>
      </aside>
    </>
  )
}

