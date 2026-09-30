import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Camera, X, Sparkles, CheckCircle2, ShieldAlert, FileSignature } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import {
  INSPECTION_CONDITIONS,
  conditionLabel,
  fetchInspections,
  phaseInspections,
  saveInspection,
  uploadInspectionPhotos,
} from '../lib/inspections'
import { analyzeInspectionPhotos } from '../lib/aiInspection'
import SignatureModal from './SignatureModal'
import './InspectionPanel.css'

const PHASE_COPY = {
  checkin: {
    title: 'Check-in',
    hint: 'Photos at pickup. Wear is fine — damage is not.',
  },
  checkout: {
    title: 'Check-out',
    hint: 'Photos at return. Compare with pickup.',
  },
}

function PhaseBlock({ phase, rows, canAdd, onAdd }) {
  const copy = PHASE_COPY[phase]
  return (
    <div className="insp__col">
      <h4>{copy.title}</h4>
      {rows.length === 0 ? <p className="insp__empty">{copy.hint}</p> : null}
      {rows.map((row) => (
        <InspectionCard key={row.id} row={row} />
      ))}
      {canAdd ? (
        <button type="button" className="btn-outline w-full" onClick={onAdd} aria-label={`Add ${copy.title} photos`}>
          <Camera size={14} /> Add {copy.title.toLowerCase()} photos
        </button>
      ) : null}
    </div>
  )
}

function InspectionCard({ row }) {
  const [open, setOpen] = useState('')
  return (
    <div className="insp__card">
      <div className="insp__who">
        <strong>{row.submitter?.full_name || (row.role === 'lister' ? 'Lister' : 'Renter')}</strong>
        <em>{conditionLabel(row.condition)}</em>
      </div>
      {row.notes ? <p>{row.notes}</p> : null}
      {row.photos?.length ? (
        <div className="insp__photos">
          {row.photos.map((src) => (
            <button key={src} type="button" onClick={() => setOpen(src)} aria-label="Open inspection photo">
              <img src={src} alt="" />
            </button>
          ))}
        </div>
      ) : null}
      {open ? createPortal(
        <button type="button" className="insp-lightbox" onClick={() => setOpen('')} aria-label="Close photo">
          <img src={open} alt="Inspection" />
        </button>,
        document.body
      ) : null}
    </div>
  )
}

function InspectionModal({ booking, role, phase, onClose, onSaved }) {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [condition, setCondition] = useState('good')
  const [notes, setNotes] = useState('')
  const [files, setFiles] = useState([])
  const [previews, setPreviews] = useState([])
  const [saving, setSaving] = useState(false)
  const copy = PHASE_COPY[phase]

  useEffect(() => {
    const urls = files.map((file) => URL.createObjectURL(file))
    setPreviews(urls)
    return () => urls.forEach((url) => URL.revokeObjectURL(url))
  }, [files])

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const pickFiles = (list) => {
    const next = [...files, ...Array.from(list || [])]
      .filter((file) => file.type.startsWith('image/'))
      .slice(0, 6)
    setFiles(next)
  }

  const submit = async () => {
    if (!files.length) {
      showToast('Add at least one photo.', 'error')
      return
    }
    setSaving(true)
    try {
      const photos = await uploadInspectionPhotos({
        userId: user.id,
        bookingId: booking.id,
        phase,
        files,
      })
      await saveInspection({
        bookingId: booking.id,
        listingId: booking.listing_id,
        userId: user.id,
        role,
        phase,
        notes,
        condition,
        photos,
      })
      showToast(`${copy.title} photos saved`, 'success')
      onSaved()
    } catch (err) {
      showToast(err.message || 'Could not save photos.', 'error')
    }
    setSaving(false)
  }

  return createPortal(
    <div className="insp-modal-bg" onClick={onClose} role="presentation">
      <div className="insp-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-labelledby="insp-title">
        <button type="button" className="ld-icon-btn insp-modal__x" onClick={onClose} aria-label="Close check-in form">
          <X size={14} />
        </button>
        <h3 id="insp-title">{copy.title} photos</h3>
        <p>{copy.hint} These sit with the booking if anything is disputed.</p>

        <p className="field-label">Condition</p>
        <div className="insp-modal__conds" role="group" aria-label="Gear condition">
          {INSPECTION_CONDITIONS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={condition === item.id ? 'is-on' : ''}
              onClick={() => setCondition(item.id)}
              aria-pressed={condition === item.id}
            >
              {item.label}
            </button>
          ))}
        </div>

        <label className="field-label" htmlFor={`insp-notes-${phase}`}>Notes</label>
        <textarea
          id={`insp-notes-${phase}`}
          className="input-dark"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Scratches, missing cable, box condition…"
          aria-label="Inspection notes"
        />

        <label className="insp-modal__file">
          <input
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            onChange={(e) => pickFiles(e.target.files)}
            aria-label="Upload inspection photos"
          />
          + Add photos (up to 6)
        </label>
        {previews.length ? (
          <div className="insp-modal__previews">
            {previews.map((src) => <img key={src} src={src} alt="" />)}
          </div>
        ) : null}

        <button type="button" className="btn-primary w-full" onClick={submit} disabled={saving}>
          {saving ? 'Saving…' : `Save ${copy.title.toLowerCase()}`}
        </button>
      </div>
    </div>,
    document.body
  )
}

export default function InspectionPanel({
  booking,
  role,
  forcePhase = '',
  onForceHandled,
  onAfterSave,
}) {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [rows, setRows] = useState([])
  const [phase, setPhase] = useState('')
  const [aiAnalyzing, setAiAnalyzing] = useState(false)
  const [aiResult, setAiResult] = useState(null)
  const [signatureModalOpen, setSignatureModalOpen] = useState(false)
  const [signatureData, setSignatureData] = useState(booking?.signatureData || null)

  const load = async () => {
    try {
      setRows(await fetchInspections(booking.id))
    } catch {
      setRows([])
    }
  }

  useEffect(() => {
    load()
  }, [booking.id])

  useEffect(() => {
    if (forcePhase) setPhase(forcePhase)
  }, [forcePhase])

  const checkinRows = phaseInspections(rows, 'checkin')
  const checkoutRows = phaseInspections(rows, 'checkout')

  const prePhoto = checkinRows[0]?.photos?.[0]
  const postPhoto = checkoutRows[0]?.photos?.[0]
  const canRunAi = Boolean(prePhoto && postPhoto)

  const runAiDiff = async () => {
    if (!canRunAi) return
    setAiAnalyzing(true)
    try {
      const res = await analyzeInspectionPhotos(prePhoto, postPhoto)
      setAiResult(res)
      showToast(`AI Inspection Complete: ${res.integrityScore}% Match`, 'success')
    } catch (err) {
      showToast('AI analysis failed to processing image diff', 'error')
    } finally {
      setAiAnalyzing(false)
    }
  }

  const mine = (which) => rows.some((row) => row.phase === which && row.submitted_by === user?.id)
  const status = booking.status || 'pending'
  const canCheckin = ['confirmed', 'active', 'completed'].includes(status) && !mine('checkin')
  const canCheckout = ['active', 'completed'].includes(status) && !mine('checkout')

  const handleSaved = async () => {
    const done = phase
    setPhase('')
    onForceHandled?.()
    await load()
    onAfterSave?.(done)
  }

  return (
    <div className="insp space-y-4">
      <div className="flex items-center justify-between">
        <p className="insp__title">Condition Check-in / Check-out</p>
        <button
          type="button"
          onClick={() => setSignatureModalOpen(true)}
          className="text-xs font-display flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 transition-all"
        >
          <FileSignature size={14} />
          {signatureData ? '✍️ Agreement E-Signed' : '✍️ E-Sign Agreement'}
        </button>
      </div>

      <div className="insp__cols">
        <PhaseBlock
          phase="checkin"
          rows={checkinRows}
          canAdd={canCheckin}
          onAdd={() => setPhase('checkin')}
        />
        <PhaseBlock
          phase="checkout"
          rows={checkoutRows}
          canAdd={canCheckout}
          onAdd={() => setPhase('checkout')}
        />
      </div>

      {/* AI Photo Inspection Trigger & Result Card */}
      {canRunAi && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-cyan-950/40 via-purple-950/40 to-slate-900 border border-cyan-500/30 text-xs font-display space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="text-cyan-400 animate-pulse" size={16} />
              <span className="font-bold text-white uppercase tracking-wider">AI Photo Integrity Scanner</span>
            </div>
            <button
              type="button"
              onClick={runAiDiff}
              disabled={aiAnalyzing}
              className="px-3 py-1.5 rounded-xl bg-cyan-500/20 border border-cyan-500/50 text-cyan-300 font-bold hover:bg-cyan-500/30 transition-all disabled:opacity-50"
            >
              {aiAnalyzing ? 'Analyzing Pixels…' : '⚡ Run AI Comparison'}
            </button>
          </div>

          {aiResult && (
            <div className="mt-3 p-3 rounded-xl bg-black/40 border border-white/10 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-white/80">Visual Integrity Match Score:</span>
                <span className={`font-bold text-sm text-${aiResult.badgeColor}-400`}>
                  {aiResult.integrityScore}% ({aiResult.status})
                </span>
              </div>
              <p className="text-white/60 text-[11px]">{aiResult.summary}</p>

              {aiResult.flaggedSectors?.length > 0 && (
                <div className="mt-2 pt-2 border-t border-white/10">
                  <span className="text-amber-400 font-bold block mb-1">Flagged Anomaly Regions:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {aiResult.flaggedSectors.map((sec, idx) => (
                      <span key={idx} className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[10px]">
                        📍 {sec.region} ({sec.intensity})
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {aiResult.diffDataUrl && (
                <div className="mt-2">
                  <span className="text-white/50 block text-[10px] mb-1">AI Difference Heatmap Overlay:</span>
                  <img src={aiResult.diffDataUrl} alt="AI Difference Heatmap" className="w-full h-24 object-cover rounded-lg border border-cyan-500/20" />
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {phase ? (
        <InspectionModal
          booking={booking}
          role={role}
          phase={phase}
          onClose={() => { setPhase(''); onForceHandled?.() }}
          onSaved={handleSaved}
        />
      ) : null}

      {signatureModalOpen && (
        <SignatureModal
          booking={booking}
          signerName={user?.user_metadata?.full_name || user?.email}
          signerRole={role}
          onClose={() => setSignatureModalOpen(false)}
          onSaveSignature={(payload) => {
            setSignatureData(payload)
            booking.renter_signature = payload.signatureUrl
            booking.signedAt = payload.signedAt
            booking.signerRole = payload.signerRole
          }}
        />
      )}
    </div>
  )
}

export function hasPhase(rows, phase) {
  return phaseInspections(rows, phase).length > 0
}
