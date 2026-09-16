import { useState, useEffect } from 'react'
import { X, Download } from 'lucide-react'

export default function InstallPrompt() {
  const [prompt,    setPrompt]    = useState(null)
  const [show,      setShow]      = useState(false)
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem('pwa-dismissed') === 'true'
  )

  useEffect(() => {
    if (dismissed) return
    const handler = (e) => { e.preventDefault(); setPrompt(e); setShow(true) }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [dismissed])

  const install = async () => {
    if (!prompt) return
    prompt.prompt()
    const { outcome } = await prompt.userChoice
    if (outcome === 'accepted') setShow(false)
    setPrompt(null)
  }

  const dismiss = () => {
    setShow(false)
    setDismissed(true)
    localStorage.setItem('pwa-dismissed', 'true')
  }

  if (!show) return null

  return (
    <div
      className="fixed bottom-24 left-4 right-4 sm:left-auto sm:right-6 sm:w-80 z-50 rounded-2xl p-4 shadow-2xl"
      style={{ background: 'rgba(14,14,28,0.97)', border: '1px solid rgba(255,46,109,0.3)', backdropFilter: 'blur(20px)' }}>
      <button onClick={dismiss}
        className="absolute top-3 right-3 transition-opacity hover:opacity-70"
        style={{ color: 'rgba(255,255,255,0.35)' }}>
        <X size={16} />
      </button>
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
          style={{ background: 'rgba(255,46,109,0.15)', border: '1px solid rgba(255,46,109,0.3)' }}>
          🎮
        </div>
        <div>
          <p className="font-bungee text-sm text-white">Install लोकल Den</p>
          <p className="text-xs font-display" style={{ color: 'rgba(255,255,255,0.4)' }}>Add to home screen</p>
        </div>
      </div>
      <button onClick={install} className="btn-primary w-full py-2.5 text-sm">
        <Download size={14} /> Install App
      </button>
    </div>
  )
}
