import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bell } from 'lucide-react'
import { useNotifications } from '../contexts/NotificationContext'
import './NotificationBell.css'

function timeAgo(iso) {
  if (!iso) return ''
  const diff = Math.max(0, Date.now() - new Date(iso).getTime())
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h`
  return `${Math.floor(hours / 24)}d`
}

export default function NotificationBell() {
  const { items, unread, markRead, markAll, enableBrowserAlerts } = useNotifications()
  const [open, setOpen] = useState(false)
  const wrap = useRef(null)

  useEffect(() => {
    const onDoc = (e) => {
      if (wrap.current && !wrap.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  return (
    <div className="nbell" ref={wrap}>
      <button
        type="button"
        className="nbell__btn"
        onClick={() => setOpen((v) => !v)}
        aria-label={unread ? `${unread} unread booking alerts` : 'Booking alerts'}
        aria-expanded={open}
      >
        <Bell size={16} />
        {unread > 0 ? <span className="nbell__dot">{unread > 9 ? '9+' : unread}</span> : null}
      </button>

      {open ? (
        <div className="nbell__panel" role="dialog" aria-label="Booking alerts">
          <div className="nbell__head">
            <strong>Booking alerts</strong>
            {unread > 0 ? (
              <button type="button" onClick={markAll} aria-label="Mark all alerts read">Mark all read</button>
            ) : null}
          </div>
          {items.length === 0 ? (
            <p className="nbell__empty">No alerts yet. Confirmations, pickup tomorrow, and return-due land here.</p>
          ) : (
            items.map((row) => (
              <Link
                key={row.id}
                to={row.link || '/dashboard'}
                className={`nbell__item${row.is_read ? '' : ' is-new'}`}
                onClick={() => { markRead(row.id); setOpen(false) }}
              >
                <b>{row.title}</b>
                <span>{row.body} · {timeAgo(row.created_at)}</span>
              </Link>
            ))
          )}
          <button
            type="button"
            className="nbell__enable"
            onClick={enableBrowserAlerts}
            aria-label="Enable browser booking alerts"
          >
            Enable browser alerts
          </button>
        </div>
      ) : null}
    </div>
  )
}
