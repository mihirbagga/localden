import { useState } from 'react'
import { X, Upload, CheckCircle2, ShieldAlert, Camera } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { supabase } from '../lib/supabase'
import { submitInspection, useInspections } from '../hooks/useInspections'

const CONDITIONS = [
  { value: 'like_new', label: '✨ Like New', desc: 'Flawless condition, zero scratches' },
  { value: 'good',     label: '👍 Good',     desc: 'Normal minor wear, fully functional' },
  { value: 'fair',     label: '⚠️ Fair',     desc: 'Visible scuffs, works fine' },
  { value: 'damaged',  label: '💥 Damaged',  desc: 'Broken parts, deep scratches or defects' },
]

export default function InspectionModal({ booking, defaultPhase = 'checkin', onClose, onSuccess }) {
  const { user } = useAuth()
  const { showToast } = useToast()

  const [phase, setPhase]         = useState(defaultPhase)
  const [condition, setCondition] = useState('good')
  const [notes, setNotes]         = useState('')
  const [files, setFiles]         = useState([])
  const [submitting, setSubmitting] = useState(false)

  // Checklist items
  const [checks, setChecks] = useState({
    powerCable: false,
    accessories: false,
    noDamage: false,
    testedWorking: false,
  })

  const { inspections, loading, refreshInspections } = useInspections(booking?.id)

  const isLister = user?.id === booking?.lister_id
  const role = isLister ? 'lister' : 'renter'

  const handleFiles = (e) => {
    const incoming = Array.from(e.target.files).slice(0, 4)
    setFiles((prev) => [...prev, ...incoming].slice(0, 4))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!condition) return showToast('Select item condition', 'error')
    setSubmitting(true)

    try {
      const photos = []
      for (const file of files) {
        const ext = file.name.split('.').pop()
        const path = `inspections/${booking.id}/${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`
        const { error: upErr } = await supabase.storage.from('listing-photos').upload(path, file, { upsert: true })
        if (!upErr) {
          const { data: { publicUrl } } = supabase.storage.from('listing-photos').getPublicUrl(path)
          photos.push(publicUrl)
        }
      }

      await submitInspection({
        bookingId: booking.id,
        listingId: booking.listing_id,
        submittedBy: user.id,
        role,
        phase,
        condition,
        notes,
        photos,
      })

      showToast(`${phase === 'checkin' ? 'Check-in' : 'Check-out'} report submitted!`, 'success')
      if (onSuccess) onSuccess()
      onClose()
    } catch (err) {
      showToast(err.message || 'Inspection failed', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  if (!booking) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="glass relative w-full max-w-lg rounded-3xl p-6 border border-cyan-500/30 shadow-2xl my-8">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-white/50 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl flex-shrink-0"
            style={{ background: 'rgba(0,255,148,0.12)', border: '1px solid rgba(0,255,148,0.3)' }}
          >
            📋
          </div>
          <div>
            <p className="section-label">Digital Handover Inspection</p>
            <h2 className="font-bungee text-xl text-white leading-tight">{booking?.listings?.title}</h2>
          </div>
        </div>

        {/* Previous Reports Section */}
        {inspections.length > 0 && (
          <div className="mb-6 p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
            <h4 className="text-xs font-display font-bold text-cyan-400 uppercase tracking-wider">Submitted Inspections</h4>
            {inspections.map((ins) => (
              <div key={ins.id} className="text-xs font-display flex items-center justify-between p-2 rounded-xl bg-white/5">
                <div>
                  <span className="font-bold text-white uppercase">{ins.phase}</span> · by {ins.profiles?.full_name || ins.role}
                </div>
                <span className="text-emerald-400 font-semibold">{ins.condition.replace('_', ' ')}</span>
              </div>
            ))}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Phase Selector */}
          <div>
            <label className="field-label mb-2 block">INSPECTION STAGE</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPhase('checkin')}
                className={`p-3 rounded-xl font-display font-bold text-xs transition-all ${
                  phase === 'checkin'
                    ? 'bg-cyan-500/20 border border-cyan-500 text-cyan-400'
                    : 'bg-white/5 border border-white/10 text-white/60'
                }`}
              >
                📥 Check-in (Pickup)
              </button>
              <button
                type="button"
                onClick={() => setPhase('checkout')}
                className={`p-3 rounded-xl font-display font-bold text-xs transition-all ${
                  phase === 'checkout'
                    ? 'bg-purple-500/20 border border-purple-500 text-purple-400'
                    : 'bg-white/5 border border-white/10 text-white/60'
                }`}
              >
                📤 Check-out (Return)
              </button>
            </div>
          </div>

          {/* Condition Rating */}
          <div>
            <label className="field-label mb-2 block">GEAR CONDITION *</label>
            <div className="grid grid-cols-2 gap-2">
              {CONDITIONS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setCondition(c.value)}
                  className={`p-3 rounded-xl text-left transition-all ${
                    condition === c.value
                      ? 'bg-pink-500/20 border border-pink-500'
                      : 'bg-white/5 border border-white/10'
                  }`}
                >
                  <div className="font-display font-bold text-xs text-white">{c.label}</div>
                  <div className="text-[10px] font-display text-white/40 mt-0.5">{c.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Verification Checklist */}
          <div>
            <label className="field-label mb-2 block">HANDOVER CHECKLIST</label>
            <div className="space-y-2">
              {[
                { key: 'powerCable', label: 'Power & HDMI Cables present' },
                { key: 'accessories', label: 'All listed accessories verified' },
                { key: 'noDamage', label: 'Inspected for visible cracks or damage' },
                { key: 'testedWorking', label: 'Powered ON & verified functional' },
              ].map((item) => (
                <label
                  key={item.key}
                  className="flex items-center gap-3 p-2.5 rounded-xl bg-white/5 border border-white/5 text-xs font-display text-white/80 cursor-pointer hover:bg-white/10"
                >
                  <input
                    type="checkbox"
                    checked={checks[item.key]}
                    onChange={(e) => setChecks((prev) => ({ ...prev, [item.key]: e.target.checked }))}
                    className="accent-pink-500 rounded"
                  />
                  {item.label}
                </label>
              ))}
            </div>
          </div>

          {/* Photos */}
          <div>
            <label className="field-label mb-2 block">CONDITION PHOTOS (UP TO 4)</label>
            <div className="flex flex-wrap gap-2">
              {files.map((f, i) => (
                <div key={i} className="relative w-16 h-16 rounded-xl overflow-hidden border border-white/20">
                  <img src={URL.createObjectURL(f)} className="w-full h-full object-cover" alt="inspection photo" />
                  <button
                    type="button"
                    onClick={() => setFiles((fs) => fs.filter((_, j) => j !== i))}
                    className="absolute top-1 right-1 w-4 h-4 bg-black/80 rounded-full flex items-center justify-center text-white"
                  >
                    <X size={10} />
                  </button>
                </div>
              ))}
              {files.length < 4 && (
                <label className="w-16 h-16 rounded-xl bg-white/5 border border-dashed border-white/20 flex flex-col items-center justify-center cursor-pointer hover:bg-white/10">
                  <Camera size={18} className="text-white/40" />
                  <span className="text-[10px] font-display text-white/40 mt-1">Add</span>
                  <input type="file" accept="image/*" multiple className="hidden" onChange={handleFiles} />
                </label>
              )}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="field-label mb-2 block">NOTES / OBSERVATIONS</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="e.g. Small scratch on top cover present prior to handover..."
              className="input-dark w-full resize-none text-xs"
              style={{ paddingTop: 10, paddingBottom: 10 }}
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="btn-primary w-full py-3.5 text-sm"
          >
            {submitting ? 'Submitting Report…' : 'Submit Inspection Report'}
          </button>
        </form>
      </div>
    </div>
  )
}
