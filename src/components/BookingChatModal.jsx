import { useState, useEffect, useRef } from 'react'
import { X, Send, MessageSquare } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { useBookingChat } from '../hooks/useBookingChat'

export default function BookingChatModal({ booking, onClose }) {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [input, setInput] = useState('')
  const bottomRef = useRef(null)

  const { messages, loading, sending, sendMessage } = useBookingChat(booking?.id)

  const listingTitle = booking?.listings?.title || 'Item'
  const isLister = user?.id === booking?.lister_id

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async (e) => {
    e.preventDefault()
    if (!input.trim()) return
    const text = input
    setInput('')
    try {
      await sendMessage(user.id, text)
    } catch (err) {
      showToast(err.message || 'Failed to send message', 'error')
      setInput(text)
    }
  }

  if (!booking) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in">
      <div
        className="glass relative w-full max-w-lg rounded-3xl overflow-hidden flex flex-col shadow-2xl"
        style={{ height: '80vh', maxHeight: '650px', border: '1px solid rgba(255,46,109,0.3)' }}
      >
        {/* Header */}
        <div className="p-4 flex items-center justify-between border-b border-white/10" style={{ background: 'rgba(10,10,20,0.8)' }}>
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg"
              style={{ background: 'rgba(0,229,255,0.15)', border: '1px solid rgba(0,229,255,0.3)', color: '#00e5ff' }}
            >
              💬
            </div>
            <div>
              <h3 className="font-bungee text-base text-white leading-tight">{listingTitle}</h3>
              <p className="text-xs font-display text-white/50">
                Chatting with {isLister ? 'Renter' : 'Lister'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-white/50 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Close chat"
          >
            <X size={18} />
          </button>
        </div>

        {/* Messages List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="h-full flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-white/40">
              <MessageSquare size={36} className="mb-2 opacity-50" />
              <p className="font-display text-sm font-semibold">No messages yet</p>
              <p className="font-display text-xs mt-1">Coordinate pickup, questions, or handover details here.</p>
            </div>
          ) : (
            messages.map((m) => {
              const isMe = m.sender_id === user?.id
              return (
                <div
                  key={m.id}
                  className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className="max-w-[80%] rounded-2xl px-4 py-2.5 text-sm font-display leading-relaxed"
                    style={{
                      background: isMe
                        ? 'linear-gradient(135deg, #ff2e6d, #e01e5a)'
                        : 'rgba(255, 255, 255, 0.08)',
                      border: isMe
                        ? 'none'
                        : '1px solid rgba(255, 255, 255, 0.12)',
                      color: 'white',
                      borderBottomRightRadius: isMe ? 4 : 16,
                      borderBottomLeftRadius: isMe ? 16 : 4,
                    }}
                  >
                    {!isMe && (
                      <span className="block text-[10px] font-bold text-cyan-400 mb-0.5">
                        {m.sender?.full_name || 'User'}
                      </span>
                    )}
                    {m.body}
                  </div>
                  <span className="text-[10px] text-white/30 mt-1 px-1">
                    {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              )
            })
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input Form */}
        <form onSubmit={handleSend} className="p-3 border-t border-white/10 flex gap-2" style={{ background: 'rgba(10,10,20,0.9)' }}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            className="input-dark flex-1 text-sm py-2.5"
            style={{ paddingLeft: 14 }}
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="btn-primary px-4 py-2.5 flex items-center justify-center"
            style={{ opacity: sending || !input.trim() ? 0.5 : 1 }}
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  )
}
