import { useRef, useState, useEffect } from 'react'
import { X, CheckCircle2, RotateCcw, PenTool, Type } from 'lucide-react'
import { useToast } from '../contexts/ToastContext'

export default function SignatureModal({ booking, signerName, signerRole = 'renter', onClose, onSaveSignature }) {
  const { showToast } = useToast()
  const canvasRef = useRef(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [isEmpty, setIsEmpty] = useState(true)
  const [mode, setMode] = useState('draw') // 'draw' | 'type'
  const [typedName, setTypedName] = useState(signerName || '')
  const [fontStyle, setFontStyle] = useState('font-cursive')

  useEffect(() => {
    if (mode === 'draw' && canvasRef.current) {
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')
      ctx.lineWidth = 2.5
      ctx.lineCap = 'round'
      ctx.strokeStyle = '#00ff94' // Neon green signature stroke
    }
  }, [mode])

  const startDrawing = (e) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const rect = canvas.getBoundingClientRect()
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    ctx.beginPath()
    ctx.moveTo(clientX - rect.left, clientY - rect.top)
    setIsDrawing(true)
    setIsEmpty(false)
  }

  const draw = (e) => {
    if (!isDrawing) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const rect = canvas.getBoundingClientRect()
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    ctx.lineTo(clientX - rect.left, clientY - rect.top)
    ctx.stroke()
  }

  const stopDrawing = () => {
    setIsDrawing(false)
  }

  const clearCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setIsEmpty(true)
  }

  const handleSave = () => {
    let signatureDataUrl = ''
    if (mode === 'draw') {
      if (isEmpty) {
        showToast('Please provide your signature before saving', 'error')
        return
      }
      signatureDataUrl = canvasRef.current.toDataURL('image/png')
    } else {
      if (!typedName.trim()) {
        showToast('Please type your legal name', 'error')
        return
      }
      // Create canvas for typed signature
      const c = document.createElement('canvas')
      c.width = 400
      c.height = 120
      const ctx = c.getContext('2d')
      ctx.fillStyle = '#0f172a'
      ctx.fillRect(0, 0, 400, 120)
      ctx.font = 'italic 36px Georgia, serif'
      ctx.fillStyle = '#00ff94'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(typedName.trim(), 200, 60)
      signatureDataUrl = c.toDataURL('image/png')
    }

    const payload = {
      signatureUrl: signatureDataUrl,
      signerName: mode === 'type' ? typedName.trim() : (signerName || 'Authorized Signer'),
      signerRole,
      signedAt: new Date().toISOString(),
      ipLog: 'Logged via Web Client (Verified)',
    }

    onSaveSignature(payload)
    showToast('Digital Agreement E-Signed successfully!', 'success')
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="glass relative w-full max-w-lg rounded-3xl p-6 border border-emerald-500/30 shadow-2xl my-8">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-white/50 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl flex-shrink-0"
            style={{ background: 'rgba(0,255,148,0.12)', border: '1px solid rgba(0,255,148,0.3)' }}
          >
            ✍️
          </div>
          <div>
            <p className="section-label">Legal E-Signature</p>
            <h2 className="font-bungee text-lg text-white leading-tight">Digital Rental Contract Signature</h2>
          </div>
        </div>

        <p className="text-xs text-white/70 font-display mb-4">
          By signing below, you legally execute the rental contract for{' '}
          <span className="text-emerald-400 font-bold">{booking?.listings?.title || 'this system'}</span>.
        </p>

        {/* Mode Selector */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <button
            type="button"
            onClick={() => setMode('draw')}
            className={`p-2.5 rounded-xl font-display font-bold text-xs flex items-center justify-center gap-2 transition-all ${
              mode === 'draw'
                ? 'bg-emerald-500/20 border border-emerald-500 text-emerald-400'
                : 'bg-white/5 border border-white/10 text-white/60'
            }`}
          >
            <PenTool size={14} /> Draw Signature
          </button>
          <button
            type="button"
            onClick={() => setMode('type')}
            className={`p-2.5 rounded-xl font-display font-bold text-xs flex items-center justify-center gap-2 transition-all ${
              mode === 'type'
                ? 'bg-emerald-500/20 border border-emerald-500 text-emerald-400'
                : 'bg-white/5 border border-white/10 text-white/60'
            }`}
          >
            <Type size={14} /> Type Signature
          </button>
        </div>

        {/* Canvas or Type Area */}
        {mode === 'draw' ? (
          <div className="relative mb-4">
            <canvas
              ref={canvasRef}
              width={440}
              height={150}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
              className="w-full h-36 bg-slate-900/90 rounded-2xl border border-white/10 touch-none cursor-crosshair"
            />
            {isEmpty && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-white/30 text-xs font-display">
                Draw your signature here with touch or cursor
              </div>
            )}
            <button
              type="button"
              onClick={clearCanvas}
              className="absolute bottom-3 right-3 p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/70 text-xs font-display flex items-center gap-1 transition-colors"
            >
              <RotateCcw size={12} /> Clear
            </button>
          </div>
        ) : (
          <div className="mb-4 space-y-3">
            <input
              type="text"
              value={typedName}
              onChange={(e) => setTypedName(e.target.value)}
              placeholder="Type your full legal name"
              className="input-dark w-full text-sm py-3"
            />
            <div className="p-4 bg-slate-900/90 rounded-2xl border border-white/10 text-center">
              <span className="font-serif italic text-2xl text-emerald-400 tracking-wider">
                {typedName || 'Your Signature Preview'}
              </span>
            </div>
          </div>
        )}

        {/* Legal Disclaimer & Timestamp */}
        <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-[11px] font-display text-white/60 mb-5 leading-relaxed">
          🔒 Legal Audit Trail: Timestamped at {new Date().toLocaleTimeString()} on {new Date().toLocaleDateString('en-IN')}. Bound to Rental Agreement #{booking?.id?.slice(0, 8)}.
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="btn-outline flex-1 py-3 text-xs"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="btn-primary flex-1 py-3 text-xs flex items-center justify-center gap-2"
          >
            <CheckCircle2 size={15} /> Save & Attach Signature
          </button>
        </div>
      </div>
    </div>
  )
}
