import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Bell,
  Check,
  CheckCheck,
  FileText,
  Clock,
  Truck,
  ShieldCheck,
  Wallet,
  AlertTriangle,
  ChevronRight,
  ExternalLink,
  Sparkles,
} from 'lucide-react'
import { useNotifications } from '../contexts/NotificationContext'
import { useToast } from '../contexts/ToastContext'
import './NotificationBell.css'

function timeAgo(iso) {
  if (!iso) return ''
  const diff = Math.max(0, Date.now() - new Date(iso).getTime())
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

function getNotificationMeta(kind, title = '', body = '') {
  const text = `${kind || ''} ${title || ''} ${body || ''}`.toLowerCase()

  if (text.includes('agreement') || text.includes('pact') || text.includes('sign')) {
    return {
      icon: FileText,
      label: 'Rental Pact',
      badgeClass: 'nbell-cat--cyan',
      iconClass: 'text-cyan-400 bg-cyan-500/15 border-cyan-500/30',
    }
  }
  if (text.includes('deposit') || text.includes('refund')) {
    return {
      icon: Wallet,
      label: 'Security Deposit',
      badgeClass: 'nbell-cat--emerald',
      iconClass: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30',
    }
  }
  if (text.includes('confirm') || text.includes('confirmed')) {
    return {
      icon: ShieldCheck,
      label: 'Confirmed',
      badgeClass: 'nbell-cat--pink',
      iconClass: 'text-pink-400 bg-pink-500/15 border-pink-500/30',
    }
  }
  if (text.includes('handover') || text.includes('active') || text.includes('handed over')) {
    return {
      icon: Truck,
      label: 'Handover',
      badgeClass: 'nbell-cat--purple',
      iconClass: 'text-purple-400 bg-purple-500/15 border-purple-500/30',
    }
  }
  if (text.includes('return') || text.includes('due') || text.includes('pickup')) {
    return {
      icon: Clock,
      label: 'Schedule Alert',
      badgeClass: 'nbell-cat--amber',
      iconClass: 'text-amber-400 bg-amber-500/15 border-amber-500/30',
    }
  }
  if (text.includes('cancel') || text.includes('cancelled') || text.includes('dispute')) {
    return {
      icon: AlertTriangle,
      label: 'Notice',
      badgeClass: 'nbell-cat--red',
      iconClass: 'text-red-400 bg-red-500/15 border-red-500/30',
    }
  }

  return {
    icon: Bell,
    label: 'Booking Alert',
    badgeClass: 'nbell-cat--cyan',
    iconClass: 'text-cyan-400 bg-cyan-500/15 border-cyan-500/30',
  }
}

export default function NotificationBell() {
  const { showToast } = useToast()
  const { items, unread, markRead, markAll, enableBrowserAlerts } = useNotifications()
  const [open, setOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('all') // 'all' | 'unread'
  const wrap = useRef(null)

  useEffect(() => {
    const onDoc = (e) => {
      if (wrap.current && !wrap.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const filteredItems = activeTab === 'unread'
    ? items.filter((row) => !row.is_read)
    : items

  return (
    <div className="nbell" ref={wrap}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        className={`nbell__btn ${unread > 0 ? 'nbell__btn--has-unread' : ''}`}
        onClick={() => setOpen((v) => !v)}
        aria-label={unread ? `${unread} unread booking alerts` : 'Booking alerts'}
        aria-expanded={open}
      >
        <Bell size={16} className={unread > 0 ? 'text-cyan-400 animate-wiggle' : ''} />
        {unread > 0 ? (
          <span className="nbell__dot animate-pulse">
            {unread > 9 ? '9+' : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="nbell__panel" role="dialog" aria-label="Booking alerts & notifications">
          {/* Header */}
          <div className="nbell__head">
            <div className="nbell__title-wrap">
              <strong>Alerts & Updates</strong>
              {unread > 0 ? (
                <span className="nbell__unread-badge">
                  {unread} new
                </span>
              ) : null}
            </div>

            {unread > 0 ? (
              <button
                type="button"
                className="nbell__mark-all-btn"
                onClick={markAll}
                aria-label="Mark all alerts as read"
              >
                <CheckCheck size={13} />
                <span>Mark all read</span>
              </button>
            ) : null}
          </div>

          {/* Filter Tabs */}
          <div className="nbell__tabs" role="tablist" aria-label="Alert filters">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'all'}
              className={`nbell__tab ${activeTab === 'all' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('all')}
            >
              All ({items.length})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'unread'}
              className={`nbell__tab ${activeTab === 'unread' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('unread')}
            >
              Unread ({unread})
            </button>
          </div>

          {/* Notification List */}
          <div className="nbell__list">
            {filteredItems.length === 0 ? (
              <div className="nbell__empty-state">
                <div className="nbell__empty-icon">
                  <Sparkles size={22} className="text-cyan-400" />
                </div>
                <p className="nbell__empty-title">
                  {activeTab === 'unread' ? 'All caught up!' : 'No notifications yet'}
                </p>
                <p className="nbell__empty-desc">
                  {activeTab === 'unread'
                    ? 'You have zero unread notifications. Check back when rental status changes.'
                    : 'Confirmations, return reminders, and security deposit settlements land here.'}
                </p>
              </div>
            ) : (
              filteredItems.map((row) => {
                const meta = getNotificationMeta(row.kind, row.title, row.body)
                const IconComponent = meta.icon

                return (
                  <div
                    key={row.id}
                    className={`nbell__card ${row.is_read ? 'is-read' : 'is-unread'}`}
                  >
                    <Link
                      to={row.link || '/dashboard'}
                      className="nbell__card-link"
                      onClick={() => {
                        if (!row.is_read) markRead(row.id)
                        setOpen(false)
                      }}
                    >
                      {/* Left Category Icon */}
                      <div className={`nbell__card-icon border ${meta.iconClass}`}>
                        <IconComponent size={14} />
                      </div>

                      {/* Content Body */}
                      <div className="nbell__card-body">
                        <div className="nbell__card-header">
                          <span className={`nbell__card-cat ${meta.badgeClass}`}>
                            {meta.label}
                          </span>
                          <span className="nbell__card-time font-mono">
                            {timeAgo(row.created_at)}
                          </span>
                        </div>

                        <h4 className="nbell__card-title">
                          {!row.is_read && <span className="nbell__card-unread-dot" />}
                          {row.title}
                        </h4>

                        {row.body && (
                          <p className="nbell__card-desc">
                            {row.body}
                          </p>
                        )}
                      </div>

                      <div className="nbell__card-arrow">
                        <ChevronRight size={14} />
                      </div>
                    </Link>

                    {/* Quick action: mark read without leaving */}
                    {!row.is_read && (
                      <button
                        type="button"
                        className="nbell__card-mark-btn"
                        onClick={(e) => {
                          e.stopPropagation()
                          markRead(row.id)
                        }}
                        title="Mark as read"
                        aria-label="Mark alert read"
                      >
                        <Check size={12} />
                      </button>
                    )}
                  </div>
                )
              })
            )}
          </div>

          {/* Footer: Push Alerts & Links */}
          <div className="nbell__footer">
            <button
              type="button"
              className="nbell__enable-push"
              onClick={async () => {
                const ok = await enableBrowserAlerts()
                if (ok) showToast('Browser push notifications enabled!', 'success')
                else showToast('Browser notifications blocked or not supported.', 'info')
              }}
              aria-label="Enable browser alerts"
            >
              <Bell size={12} />
              <span>Enable Browser Push Notifications</span>
            </button>

            <Link
              to="/dashboard"
              className="nbell__dash-link"
              onClick={() => setOpen(false)}
            >
              <span>Dashboard</span>
              <ExternalLink size={10} />
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  )
}
