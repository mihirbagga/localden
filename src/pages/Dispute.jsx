import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { AlertTriangle, Upload, X } from 'lucide-react'
import GameBackground from '../components/GameBackground'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { supabase } from '../lib/supabase'
import { createDispute, DISPUTE_TYPES } from '../lib/disputes'

export default function Dispute() {
  const { bookingId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { showToast } = useToast()
  const [booking,    setBooking]    = useState(null)
  const [type,       setType]       = useState('')
  const [description,setDescription]= useState('')
  const [files,      setFiles]      = useState([])
  const [loading,    setLoading]    = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [done,       setDone]       = useState(false)

  useEffect(() => {
    if (!bookingId || !user) return
    supabase.from('bookings').select('*, listings(title, category)').eq('id', bookingId).single()
      .then(({ data, error }) => {
        if (error || !data) { showToast('Booking not found', 'error'); navigate('/dashboard'); return }
        if (data.renter_id !== user.id && data.lister_id !== user.id) { navigate('/dashboard'); return }
        if (!['active', 'completed'].includes(data.status)) {
          showToast('Can only dispute active or completed bookings', 'error')
          navigate('/dashboard'); return
        }
        setBooking(data); setLoading(false)
      })
  }, [bookingId, user])

  const handleFiles = (e) => {
    const incoming = Array.from(e.target.files).slice(0, 3)
    setFiles(prev => [...prev, ...incoming].slice(0, 3))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!type) { showToast('Select a dispute type', 'error'); return }
    if (!description.trim()) { showToast('Describe the issue', 'error'); return }
    setSubmitting(true)
    try {
      const evidenceUrls = []
      for (const file of files) {
        const ext = file.name.split('.').pop()
        const path = `disputes/${bookingId}/${Date.now()}.${ext}`
        const { error: upErr } = await supabase.storage.from('listing-photos').upload(path, file, { upsert: true })
        if (!upErr) {
          const { data: { publicUrl } } = supabase.storage.from('listing-photos').getPublicUrl(path)
          evidenceUrls.push(publicUrl)
        }
      }
      await createDispute({ bookingId, raisedBy: user.id, type, description, evidenceUrls })
      setDone(true)
      showToast('Dispute raised. Admin will review within 24h.', 'success')
    } catch (err) {
      showToast(err.message || 'Failed to raise dispute', 'error')
    } finally { setSubmitting(false) }
  }

  if (loading) return (
    <div className="relative min-h-screen pt-24 flex items-center justify-center">
      <div className="grid-floor" /><GameBackground />
      <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
    </div>
  )

  if (done) return (
    <div className="relative min-h-screen pt-24 flex items-center justify-center">
      <div className="grid-floor" /><GameBackground />
      <div className="relative z-10 text-center px-4">
        <div className="text-6xl mb-4">⚖️</div>
        <h2 className="font-bungee text-3xl text-white mb-3">Dispute Raised</h2>
        <p className="font-display mb-6" style={{ color: 'rgba(255,255,255,0.5)' }}>
          Our team will review and respond within 24 hours.
        </p>
        <Link to="/dashboard" className="btn-primary">Back to Dashboard</Link>
      </div>
    </div>
  )

  return (
    <div className="relative min-h-screen pt-24 pb-20">
      <div className="grid-floor" /><GameBackground />
      <div className="relative z-10 max-w-lg mx-auto px-4">
        <div className="glass rounded-3xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(255,140,0,0.12)', border: '1px solid rgba(255,140,0,0.3)' }}>
              <AlertTriangle size={22} style={{ color: '#ff8c00' }} />
            </div>
            <div>
              <p className="section-label">Dispute Center</p>
              <h1 className="font-bungee text-xl text-white leading-tight">{booking?.listings?.title}</h1>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Type */}
            <div>
              <label className="field-label mb-3 block">ISSUE TYPE *</label>
              <div className="space-y-2">
                {DISPUTE_TYPES.map(d => (
                  <button key={d.value} type="button" onClick={() => setType(d.value)}
                    className="w-full text-left p-3 rounded-xl transition-all duration-200"
                    style={{
                      background: type === d.value ? 'rgba(255,140,0,0.1)' : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${type === d.value ? 'rgba(255,140,0,0.4)' : 'rgba(255,255,255,0.07)'}`,
                    }}>
                    <div className="font-display font-bold text-sm text-white">{d.label}</div>
                    <div className="text-xs font-display" style={{ color: 'rgba(255,255,255,0.4)' }}>{d.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="field-label mb-2 block">DESCRIBE THE ISSUE *</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)}
                rows={4} placeholder="Provide as much detail as possible..."
                className="input-dark w-full resize-none" style={{ paddingTop: 12, paddingBottom: 12 }} />
            </div>

            {/* Evidence photos */}
            <div>
              <label className="field-label mb-2 block">EVIDENCE PHOTOS (UP TO 3)</label>
              <div className="flex flex-wrap gap-2">
                {files.map((f, i) => (
                  <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden">
                    <img src={URL.createObjectURL(f)} className="w-full h-full object-cover" alt="evidence" />
                    <button type="button" onClick={() => setFiles(fs => fs.filter((_, j) => j !== i))}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center"
                      style={{ background: 'rgba(0,0,0,0.7)' }}>
                      <X size={10} style={{ color: 'white' }} />
                    </button>
                  </div>
                ))}
                {files.length < 3 && (
                  <label className="w-20 h-20 rounded-xl flex flex-col items-center justify-center cursor-pointer"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '2px dashed rgba(255,255,255,0.1)' }}>
                    <Upload size={16} style={{ color: 'rgba(255,255,255,0.3)' }} />
                    <span className="text-xs font-display mt-1" style={{ color: 'rgba(255,255,255,0.3)' }}>Add</span>
                    <input type="file" accept="image/*" multiple className="hidden" onChange={handleFiles} />
                  </label>
                )}
              </div>
            </div>

            <button type="submit" disabled={submitting} className="btn-primary w-full py-4"
              style={{ background: submitting ? undefined : 'linear-gradient(90deg,#ff8c00,#ff2e6d)' }}>
              {submitting ? 'Submitting…' : '⚖️ Raise Dispute'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
