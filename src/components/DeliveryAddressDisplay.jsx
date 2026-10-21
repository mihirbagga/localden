import { useState } from 'react'
import { MapPin, ExternalLink, Copy, Check, Navigation, Clock, MessageSquare } from 'lucide-react'
import { parseDeliveryAddress } from '../lib/deliveryAddress'

export default function DeliveryAddressDisplay({ address, compact = false, className = '' }) {
  const [copied, setCopied] = useState(false)
  const parsed = parseDeliveryAddress(address)

  if (!parsed.raw) return null

  const handleCopy = (e) => {
    e.stopPropagation()
    const textToCopy = parsed.mapsUrl ? `${parsed.cleanAddress} (${parsed.mapsUrl})` : parsed.cleanAddress
    navigator.clipboard.writeText(textToCopy)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (compact) {
    return (
      <div className={`flex items-center gap-1.5 flex-wrap text-xs ${className}`}>
        <MapPin size={12} className="text-cyan-400 flex-shrink-0" />
        <span className="truncate max-w-[220px]" title={parsed.cleanAddress}>
          {parsed.cleanAddress}
        </span>
        {parsed.slot && (
          <span className="px-1.5 py-0.5 rounded bg-white/10 text-[10px] text-amber-300 font-semibold">
            {parsed.slot}
          </span>
        )}
        {parsed.mapsUrl && (
          <a
            href={parsed.mapsUrl}
            target="_blank"
            rel="noreferrer"
            className="text-[10px] text-cyan-300 hover:text-cyan-200 underline flex items-center gap-0.5 ml-1"
            title="Open in Google Maps"
          >
            Maps <ExternalLink size={10} />
          </a>
        )}
      </div>
    )
  }

  return (
    <div className={`p-2.5 rounded-xl bg-black/40 border border-white/10 text-xs space-y-2 ${className}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 min-w-0">
          <div className="w-6 h-6 rounded-lg bg-pink-500/20 text-pink-400 flex items-center justify-center flex-shrink-0 mt-0.5">
            <MapPin size={14} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
              <strong className="text-cyan-300 text-[11px] uppercase tracking-wider">
                📍 Delivery Address
              </strong>
              {parsed.isGpsPinned && (
                <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[9px] font-bold">
                  ✓ GPS Pinned
                </span>
              )}
            </div>
            <p className="text-white/90 leading-snug break-words font-medium">
              {parsed.cleanAddress}
            </p>
            {(parsed.slot || parsed.instructions) && (
              <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                {parsed.slot && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-200 text-[10px] font-semibold">
                    <Clock size={10} /> {parsed.slot}
                  </span>
                )}
                {parsed.instructions && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/5 border border-white/15 text-white/75 text-[10px]">
                    <MessageSquare size={10} /> {parsed.instructions}
                  </span>
                )}
              </div>
            )}
            {parsed.coordsLabel && (
              <span className="text-[10px] text-white/50 font-mono block mt-1">
                GPS Pin: {parsed.coordsLabel}
              </span>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            type="button"
            onClick={handleCopy}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-all text-[10px] flex items-center gap-1 border border-white/10"
            title={copied ? 'Copied to clipboard!' : 'Copy Address & Maps Link'}
          >
            {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
            <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy'}</span>
          </button>

          {parsed.mapsUrl && (
            <a
              href={parsed.mapsUrl}
              target="_blank"
              rel="noreferrer"
              className="px-2 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-[11px] font-bold flex items-center gap-1 border border-cyan-500/30 transition-all shadow-sm"
              title="Open Google Maps location"
            >
              <Navigation size={12} />
              <span>Open Maps</span>
              <ExternalLink size={10} />
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
