import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { X } from 'lucide-react'

export function AdminAction({ tip, ariaLabel, onClick, to, danger, on, disabled, children }) {
  const [tipPos, setTipPos] = useState(null)

  const showTip = (event) => {
    const rect = event.currentTarget.getBoundingClientRect()
    setTipPos({
      x: Math.round(rect.left + rect.width / 2),
      y: Math.round(rect.top),
    })
  }

  const hideTip = () => setTipPos(null)

  useEffect(() => {
    if (!tipPos) return undefined
    const hide = () => setTipPos(null)
    window.addEventListener('scroll', hide, true)
    return () => window.removeEventListener('scroll', hide, true)
  }, [tipPos])

  const className = [
    'admin-icon-btn',
    danger ? 'admin-icon-btn--danger' : '',
    on ? 'admin-icon-btn--on' : '',
  ].filter(Boolean).join(' ')

  const shared = {
    className,
    'aria-label': ariaLabel || tip,
    onMouseEnter: showTip,
    onMouseLeave: hideTip,
    onFocus: showTip,
    onBlur: hideTip,
  }

  const control = to ? (
    <Link to={to} {...shared}>{children}</Link>
  ) : (
    <button type="button" onClick={onClick} disabled={disabled} {...shared}>
      {children}
    </button>
  )

  return (
    <>
      {control}
      {tipPos
        ? createPortal(
            <span
              className="admin-float-tip"
              role="tooltip"
              ref={(el) => {
                if (!el) return
                el.style.setProperty('--admin-tip-x', `${tipPos.x}px`)
                el.style.setProperty('--admin-tip-y', `${tipPos.y}px`)
              }}
            >
              {tip}
            </span>,
            document.body
          )
        : null}
    </>
  )
}

export function AdminStat({ icon, label, value, sub, tone = 'magenta' }) {
  return (
    <div className={`admin-stat admin-stat--${tone}`}>
      <div className="admin-stat__icon">{icon}</div>
      <div className="admin-stat__value">{value}</div>
      <div className="admin-stat__label">{label}</div>
      {sub ? <div className="admin-stat__sub">{sub}</div> : null}
    </div>
  )
}

export function AdminTab({ label, icon, active, onClick, count, ariaLabel }) {
  return (
    <button
      type="button"
      className={`admin-tab${active ? ' is-active' : ''}`}
      onClick={onClick}
      aria-label={ariaLabel || label}
      aria-pressed={active}
    >
      {icon}
      {label}
      {count > 0 ? <span className="admin-tab__count">{count}</span> : null}
    </button>
  )
}

export function AdminSearch({ value, onChange, placeholder, ariaLabel }) {
  return (
    <input
      type="search"
      className="input-dark admin-search"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      aria-label={ariaLabel || placeholder}
    />
  )
}

export function AdminBadge({ kind, children }) {
  return <span className={`admin-badge admin-badge--${kind}`}>{children}</span>
}

export function AdminEmpty({ emoji, title, body }) {
  return (
    <div className="admin-empty">
      <div className="admin-empty__emoji">{emoji}</div>
      <div className="admin-empty__title">{title}</div>
      {body ? <p className="admin-muted">{body}</p> : null}
    </div>
  )
}

export function AdminConfirm({ title, body, confirmLabel, loading, onConfirm, onCancel }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel])

  return (
    <div className="admin-confirm-backdrop" onClick={onCancel} role="presentation">
      <div
        className="admin-confirm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-confirm-title"
        onClick={(e) => e.stopPropagation()}
      >
        <AdminAction tip="Close" ariaLabel="Close dialog" onClick={onCancel}>
          <X size={14} />
        </AdminAction>
        <h2 id="admin-confirm-title" className="admin-confirm__title">{title}</h2>
        <p className="admin-confirm__body">{body}</p>
        <div className="admin-confirm__actions">
          <button type="button" className="btn-outline" onClick={onCancel} disabled={loading}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={onConfirm}
            disabled={loading}
            aria-label={confirmLabel}
          >
            {loading ? 'Working…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export function matchesQuery(haystacks, query) {
  if (!query) return true
  const q = query.trim().toLowerCase()
  return haystacks.some((h) => String(h || '').toLowerCase().includes(q))
}
