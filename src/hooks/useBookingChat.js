import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useBookingChat(bookingId) {
  const [messages, setMessages] = useState([])
  const [loading, setLoading]   = useState(true)
  const [sending, setSending]   = useState(false)

  useEffect(() => {
    if (!bookingId) return
    setLoading(true)

    // Initial fetch
    supabase
      .from('booking_messages')
      .select('*, sender:profiles!booking_messages_sender_id_fkey(full_name, avatar_url)')
      .eq('booking_id', bookingId)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        setMessages(data || [])
        setLoading(false)
      })

    // Realtime channel
    const channel = supabase
      .channel(`booking-chat-${bookingId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'booking_messages',
          filter: `booking_id=eq.${bookingId}`,
        },
        async (payload) => {
          const newMsg = payload.new
          // Fetch sender info
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, avatar_url')
            .eq('id', newMsg.sender_id)
            .single()

          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev
            return [...prev, { ...newMsg, sender: profile }]
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [bookingId])

  const sendMessage = async (senderId, text) => {
    if (!text.trim() || sending) return
    setSending(true)
    try {
      const { error } = await supabase.from('booking_messages').insert({
        id: crypto.randomUUID(),
        booking_id: bookingId,
        sender_id: senderId,
        body: text.trim(),
        created_at: new Date().toISOString(),
      })
      if (error) throw error
    } finally {
      setSending(false)
    }
  }

  return { messages, loading, sending, sendMessage }
}
