import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, CheckCircle2, HelpCircle, X, Info } from 'lucide-react'

export default function ConfirmModal({
  isOpen,
  title = 'Are you sure?',
  message = '',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'primary', // 'primary' | 'danger' | 'success' | 'info'
  isPrompt = false,
  promptDefaultValue = '',
  promptPlaceholder = 'Type here...',
  onConfirm,
  onCancel,
}) {
  const [inputValue, setInputValue] = useState(promptDefaultValue)
  const inputRef = useRef(null)

  useEffect(() => {
    setInputValue(promptDefaultValue)
  }, [promptDefaultValue, isOpen])

  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onCancel?.()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onCancel])

  useEffect(() => {
    if (isOpen && isPrompt && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus()
        inputRef.current?.select()
      }, 50)
    }
  }, [isOpen, isPrompt])

  if (!isOpen) return null

  const handleConfirm = () => {
    if (isPrompt) {
      onConfirm?.(inputValue)
    } else {
      onConfirm?.(true)
    }
  }

  const getIcon = () => {
    if (variant === 'danger') {
      return (
        <div className="w-12 h-12 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-400 mb-4 shadow-lg shadow-red-500/10">
          <AlertTriangle size={24} />
        </div>
      )
    }
    if (variant === 'success') {
      return (
        <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-4 shadow-lg shadow-emerald-500/10">
          <CheckCircle2 size={24} />
        </div>
      )
    }
    if (variant === 'info') {
      return (
        <div className="w-12 h-12 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-4 shadow-lg shadow-cyan-500/10">
          <Info size={24} />
        </div>
      )
    }
    return (
      <div className="w-12 h-12 rounded-2xl bg-pink-500/15 border border-pink-500/30 flex items-center justify-center text-pink-400 mb-4 shadow-lg shadow-pink-500/10">
        <HelpCircle size={24} />
      </div>
    )
  }

  const getConfirmBtnClasses = () => {
    if (variant === 'danger') {
      return 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white shadow-red-600/25'
    }
    if (variant === 'success') {
      return 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-600/25'
    }
    return 'bg-gradient-to-r from-pink-600 to-cyan-500 hover:from-pink-500 hover:to-cyan-400 text-white shadow-pink-600/25'
  }

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onCancel}
      role="presentation"
    >
      <div
        className="relative w-full max-w-md rounded-2xl bg-[#0f0a18] border border-pink-500/30 p-6 shadow-2xl text-left animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onCancel}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors"
          aria-label="Close dialog"
        >
          <X size={18} />
        </button>

        {/* Icon */}
        {getIcon()}

        {/* Title */}
        <h3 id="confirm-modal-title" className="text-lg font-bungee text-white mb-2 tracking-wide">
          {title}
        </h3>

        {/* Message */}
        {message && (
          <p className="text-sm text-white/70 leading-relaxed mb-5 whitespace-pre-wrap">
            {message}
          </p>
        )}

        {/* Prompt Input if in Prompt Mode */}
        {isPrompt && (
          <div className="mb-5">
            <textarea
              ref={inputRef}
              rows={3}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={promptPlaceholder}
              className="w-full rounded-xl bg-white/5 border border-white/15 px-3.5 py-2.5 text-sm text-white placeholder-white/40 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all resize-none"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  handleConfirm()
                }
              }}
            />
            <span className="block text-[11px] text-white/40 mt-1 font-mono">
              Press Cmd/Ctrl + Enter to confirm
            </span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-xl border border-white/15 text-white/80 hover:text-white hover:bg-white/10 text-sm font-semibold transition-all"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className={`px-5 py-2 rounded-xl text-sm font-bold shadow-lg transition-all hover:scale-[1.02] ${getConfirmBtnClasses()}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
