import { CheckCircle, AlertCircle, Info, X } from 'lucide-react'
import './Toast.css'

const ICONS = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
}

export default function ToastStack({ toasts, onDismiss }) {
  if (!toasts?.length) return null

  return (
    <div className="toast-stack" role="status" aria-live="polite">
      {toasts.map((toast) => {
        const Icon = ICONS[toast.type] || Info
        return (
          <div key={toast.id} className={`toast-item toast-item--${toast.type}`}>
            <Icon size={16} className="toast-item__icon" aria-hidden="true" />
            <span className="toast-item__msg">{toast.message}</span>
            <button
              type="button"
              className="toast-item__close"
              aria-label="Dismiss notification"
              onClick={() => onDismiss(toast.id)}
            >
              <X size={12} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
