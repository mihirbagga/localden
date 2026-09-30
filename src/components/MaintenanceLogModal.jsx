import { useState } from 'react'
import { X, Wrench, CheckCircle2, Calendar } from 'lucide-react'
import { useToast } from '../contexts/ToastContext'
import { MAINTENANCE_TYPES, addMaintenanceLog } from '../lib/maintenance'

export default function MaintenanceLogModal({ listing, onClose, onSaved }) {
  const { showToast } = useToast()
  const [serviceType, setServiceType] = useState('thermal_paste')
  const [notes, setNotes] = useState('')
  const [servicedAt, setServicedAt] = useState(new Date().toISOString().split('T')[0])
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await addMaintenanceLog({
        listingId: listing.id,
        serviceType,
        notes,
        servicedAt,
      })
      showToast('Maintenance log recorded successfully!', 'success')
      if (onSaved) onSaved()
      onClose()
    } catch (err) {
      showToast(err.message || 'Could not record maintenance log', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="glass relative w-full max-w-lg rounded-3xl p-6 border border-amber-500/30 shadow-2xl my-8">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-white/50 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl flex-shrink-0"
            style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)' }}
          >
            🛠️
          </div>
          <div>
            <p className="section-label">Hardware Maintenance Log</p>
            <h2 className="font-bungee text-lg text-white leading-tight">{listing?.title || 'System Rig'}</h2>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="field-label mb-2 block">SERVICE / MAINTENANCE TYPE *</label>
            <div className="space-y-2">
              {MAINTENANCE_TYPES.map((type) => (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => setServiceType(type.id)}
                  className={`w-full text-left p-3 rounded-xl transition-all border ${
                    serviceType === type.id
                      ? 'bg-amber-500/20 border-amber-500 text-white'
                      : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                  }`}
                >
                  <div className="font-bold text-xs text-white">{type.label}</div>
                  <div className="text-[10px] text-white/50 mt-0.5">{type.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="field-label mb-2 block">SERVICE DATE *</label>
            <input
              type="date"
              value={servicedAt}
              onChange={(e) => setServicedAt(e.target.value)}
              className="input-dark w-full text-xs"
            />
          </div>

          <div>
            <label className="field-label mb-2 block">NOTES & OBSERVATIONS</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="e.g. Applied Noctua NT-H2 thermal paste. Temperatures dropped by 8°C under load."
              className="input-dark w-full text-xs resize-none"
              style={{ paddingTop: 8, paddingBottom: 8 }}
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="btn-primary w-full py-3 text-xs flex items-center justify-center gap-2"
          >
            <CheckCircle2 size={15} />
            {submitting ? 'Recording Log…' : 'Record Maintenance Log'}
          </button>
        </form>
      </div>
    </div>
  )
}
