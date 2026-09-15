import { useEffect, useRef, useState } from 'react'
import { Send } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { supabase } from '../lib/supabase'
import './BookingThread.css'

export default function BookingThread({ booking }) {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [rows, setRows] = useState([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const bottom = useRef(null)

  useEffect(() => {
    if (!booking?.id) return undefined
    let cancelled = false
    supabase
      .from('booking_messages')
      .select('*, sender:profiles!sender_id(full_name)')
      .eq('booking_id', booking.id)
      .order('created_at', { ascending: true })
      .then(({ data, error }) => {
        if (cancelled) return
        if (error && !/does not exist|schema cache/i.test(error.message || '')) {
          console.warn(error.message)
        }
        setRows(data || [])
      })

    const channel = supabase
      .channel(`chat-${booking.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'booking_messages', filter: `booking_id=eq.${booking.id}` },
        async (payload) => {
          const row = payload.new
          if (!row) return
          const { data } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', row.sender_id)
            .maybeSingle()
          setRows((prev) => (
            prev.some((item) => item.id === row.id)
              ? prev
              : [...prev, { ...row, sender: data }]
          ))
        }
      )
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [booking?.id])

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: 'end' })
  }, [rows.length])

  const send = async (e) => {
    e.preventDefault()
    const body = text.trim()
    if (!body) return
    setSending(true)
    const { error } = await supabase.from('booking_messages').insert({
      booking_id: booking.id,
      sender_id: user.id,
      body,
    })
    setSending(false)
    if (error) {
      showToast(error.message || 'Could not send. Run the wallet/chat SQL.', 'error')
      return
    }
    setText('')
  }

  return (
    <div className="bchat">
      <p className="bchat__title">Booking thread</p>
      <div className="bchat__list" role="log" aria-label="Booking messages">
        {rows.length === 0 ? (
          <p className="bchat__empty">Ask about pickup time, cables, or parking. Stays on this booking.</p>
        ) : (
          rows.map((row) => (
            <div key={row.id} className={`bchat__msg${row.sender_id === user?.id ? ' is-mine' : ''}`}>
              <strong>{row.sender_id === user?.id ? 'You' : (row.sender?.full_name || 'Them')}</strong>
              <p>{row.body}</p>
            </div>
          ))
        )}
        <div ref={bottom} />
      </div>
      <form className="bchat__form" onSubmit={send}>
        <input
          className="input-dark"
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, 1000))}
          placeholder="Message about this booking"
          aria-label="Message about this booking"
        />
        <button type="submit" className="btn-primary" disabled={sending || !text.trim()} aria-label="Send message">
          <Send size={14} />
        </button>
      </form>
    </div>
  )
}
