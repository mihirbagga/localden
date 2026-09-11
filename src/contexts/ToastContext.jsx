import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import ToastStack from '../components/Toast'

const ToastContext = createContext(null)
const TOAST_MS = 3500

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const showToast = useCallback((message, type = 'success') => {
    const id = crypto.randomUUID()
    setToasts((prev) => [...prev, { id, message, type }])
    window.setTimeout(() => dismissToast(id), TOAST_MS)
  }, [dismissToast])

  const value = useMemo(
    () => ({ showToast }),
    [showToast]
  )

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>')
  return ctx
}
