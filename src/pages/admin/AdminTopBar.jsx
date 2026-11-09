import { useState, useRef, useEffect } from 'react'
import { Search, Bell, HelpCircle, Shield, Menu, Command, X, ExternalLink, BookOpen, MessageSquare, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import NotificationBell from '../../components/NotificationBell'

export default function AdminTopBar({
  onOpenCmd,
  onToggleMobile,
  syncing,
  onSync
}) {
  const { user, isSuperAdmin, isRegionalAdmin, isHubManager } = useAuth()
  const [helpOpen, setHelpOpen] = useState(false)
  const helpRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(e) {
      if (helpRef.current && !helpRef.current.contains(e.target)) {
        setHelpOpen(false)
      }
    }
    if (helpOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [helpOpen])

  return (
    <header className="admin-topbar">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleMobile}
          className="lg:hidden p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/70"
          aria-label="Toggle navigation menu"
        >
          <Menu size={18} />
        </button>

        {/* Global Search Input / Command Trigger */}
        <div
          onClick={onOpenCmd}
          className="admin-search-input-box cursor-pointer select-none"
        >
          <Search size={15} className="text-white/40 mr-2.5 shrink-0" />
          <span className="text-xs text-white/40 flex-1 truncate">
            Search anything... (booking, user, gear)
          </span>
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-black/40 border border-white/10 text-[10px] font-mono text-white/50">
            <Command size={10} /> K
          </kbd>
        </div>
      </div>

      <div className="flex items-center gap-3 sm:gap-4">
        {/* Help & Live Notification Dropdowns */}
        <div className="flex items-center gap-2 text-white/60">
          <Link
            to="/"
            className="text-xs px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors"
          >
            Exit to Store
          </Link>

          {/* Interactive In-App Notification Center */}
          <div className="relative">
            <NotificationBell />
          </div>

          {/* Help & Admin Guide Dropdown */}
          <div className="relative" ref={helpRef}>
            <button
              type="button"
              onClick={() => setHelpOpen(!helpOpen)}
              className={`p-2 rounded-lg transition-colors ${
                helpOpen ? 'bg-white/15 text-white' : 'hover:bg-white/5 hover:text-white'
              }`}
              aria-label="Help and documentation"
              title="Admin Guide & Documentation"
            >
              <HelpCircle size={18} />
            </button>

            {helpOpen && (
              <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-[#0f1422] border border-white/10 shadow-2xl p-4 z-50 text-xs backdrop-blur-xl">
                <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles size={16} className="text-[#00e5ff]" />
                    <span className="font-bold text-white text-sm">Admin Quick Help</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setHelpOpen(false)}
                    className="p-1 rounded-md text-white/40 hover:text-white hover:bg-white/5"
                  >
                    <X size={14} />
                  </button>
                </div>

                <div className="space-y-2">
                  <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5">
                    <span className="font-semibold text-white block mb-0.5">Quick Search</span>
                    <p className="text-[11px] text-white/50">
                      Press <kbd className="px-1 rounded bg-black/40 font-mono text-cyan-300">⌘K</kbd> anywhere to find bookings, renters, or gear.
                    </p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5">
                    <span className="font-semibold text-white block mb-0.5">Handover &amp; Return PIN</span>
                    <p className="text-[11px] text-white/50">
                      Every booking has an auto-computed Handover PIN visible on the card to safely verify delivery handovers.
                    </p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5">
                    <span className="font-semibold text-white block mb-0.5">Instant WhatsApp Alerts</span>
                    <p className="text-[11px] text-white/50">
                      Use the 1-Click WhatsApp buttons on pending bookings to notify hosts and renters instantly.
                    </p>
                  </div>
                </div>

                <div className="pt-3 mt-3 border-t border-white/10 flex items-center justify-between text-[11px]">
                  <Link
                    to="/how-it-works"
                    target="_blank"
                    className="text-[#00e5ff] hover:underline flex items-center gap-1"
                  >
                    Platform SOPs <ExternalLink size={11} />
                  </Link>
                  <span className="text-white/40 font-mono">v2.0 Command Center</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
