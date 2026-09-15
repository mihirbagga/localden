import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'
import { useToast } from './ToastContext'

const NotificationContext = createContext(null)

function tableMissing(error) {
  return /does not exist|schema cache|PGRST/i.test(error?.message || '')
}

export function NotificationProvider({ children }) {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)

  const load = async (uid = user?.id) => {
    if (!uid) {
      setItems([])
      return
    }
    setLoading(true)
    await supabase.rpc('issue_due_booking_alerts')
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', uid)
      .order('created_at', { ascending: false })
      .limit(40)
    if (error && !tableMissing(error)) {
      console.warn('Notifications:', error.message)
    }
    setItems(error ? [] : (data || []))
    setLoading(false)
  }

  useEffect(() => {
    if (!user) {
      setItems([])
      return undefined
    }
    load(user.id)

    const channel = supabase
      .channel(`alerts-${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        (payload) => {
          const row = payload.new
          setItems((prev) => (prev.some((item) => item.id === row.id) ? prev : [row, ...prev]))
          if (row?.title) showToast(row.title, 'info')
          if (typeof window !== 'undefined' && window.Notification?.permission === 'granted') {
            try { new window.Notification(row.title, { body: row.body || '' }) } catch { /* ignore */ }
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [user?.id])

  const markRead = async (id) => {
    setItems((prev) => prev.map((row) => (row.id === id ? { ...row, is_read: true } : row)))
    await supabase.from('notifications').update({ is_read: true }).eq('id', id)
  }

  const markAll = async () => {
    setItems((prev) => prev.map((row) => ({ ...row, is_read: true })))
    if (user) await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id).eq('is_read', false)
  }

  const enableBrowserAlerts = async () => {
    if (typeof window === 'undefined' || !window.Notification) return false
    const perm = await window.Notification.requestPermission()
    return perm === 'granted'
  }

  const unread = items.filter((row) => !row.is_read).length

  return (
    <NotificationContext.Provider value={{
      items, unread, loading, refresh: load, markRead, markAll, enableBrowserAlerts,
    }}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const ctx = useContext(NotificationContext)
  if (!ctx) throw new Error('useNotifications must be used inside NotificationProvider')
  return ctx
}
