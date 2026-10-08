import { useState, useMemo } from 'react'
import { Smartphone, Check, Copy, Share2, ArrowUpRight, QrCode } from 'lucide-react'
import { methodConfig } from '../lib/payments'
import { useToast } from '../contexts/ToastContext'
import { buildUpiPayload, generateQrDataUri, getOnlineQrUrl } from '../lib/qrCodeService'
import '../pages/paymentMethods.css'

async function copyText(text) {
  await navigator.clipboard.writeText(text)
}

export default function PaymentOptions({
  methods,
  selectedId,
  onSelect,
  paymentRef,
  onPaymentRef,
  total = null,
}) {
  const { showToast } = useToast()
  const selected = methods.find((m) => m.id === selectedId)
  const cfg = methodConfig(selected)
  const [customQrFailed, setCustomQrFailed] = useState(false)
  const [copiedUpi, setCopiedUpi] = useState(false)

  const effectiveUpiId = cfg.upi_id?.trim() || 'localden@okhdfcbank'

  // Standard UPI URI format accepted by GPay, PhonePe, Paytm, Cred, BHIM
  const upiPayload = useMemo(() => {
    return buildUpiPayload({
      upiId: effectiveUpiId,
      payeeName: 'LocalDen',
      amount: total,
      note: 'LocalDen Hardware Rental',
    })
  }, [effectiveUpiId, total])

  // Zero-dependency pure client-side SVG QR code (runs offline, 100% reliable)
  const generatedQrDataUri = useMemo(() => {
    return generateQrDataUri(upiPayload || 'https://localden.in', {
      size: 260,
      margin: 2,
      bgColor: '#ffffff',
      color: '#000000',
    })
  }, [upiPayload])

  // Fallback high-res online image
  const onlineQrUrl = useMemo(() => {
    return getOnlineQrUrl(upiPayload, 300)
  }, [upiPayload])

  // Determine which QR image to display
  // 1. If admin uploaded an image and it hasn't failed, use that.
  // 2. If no image or if custom image fails to load, use generated QR code data URI.
  const activeQrSrc = (!customQrFailed && cfg.qr_image_url)
    ? cfg.qr_image_url
    : (generatedQrDataUri || onlineQrUrl)

  const copy = async (label, value) => {
    if (!value) return
    try {
      await copyText(value)
      setCopiedUpi(true)
      showToast(`${label} copied to clipboard!`, 'success')
      setTimeout(() => setCopiedUpi(false), 2000)
    } catch {
      showToast('Copy failed', 'error')
    }
  }

  const shareQr = async () => {
    const url = cfg.qr_image_url || onlineQrUrl
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Pay LocalDen Rental',
          text: `UPI Payment of ₹${total || ''} to ${effectiveUpiId}`,
          url,
        })
        return
      }
      await copyText(effectiveUpiId)
      showToast('UPI ID copied', 'success')
    } catch {
      /* user cancelled share */
    }
  }

  return (
    <div>
      <p className="field-label">Payment method</p>
      <div className="pay-methods" role="radiogroup" aria-label="Payment method">
        {methods.map((method) => (
          <button
            key={method.id}
            type="button"
            className={`pay-method${selectedId === method.id ? ' is-on' : ''}`}
            onClick={() => onSelect(method.id)}
            aria-label={`Pay with ${method.name}`}
            aria-pressed={selectedId === method.id}
          >
            <span className="pay-method__dot" aria-hidden="true" />
            {method.name}
          </button>
        ))}
      </div>

      {selected && selected.method_type !== 'razorpay' ? (
        <div className="pay-detail space-y-3">
          {cfg.instructions ? <p className="pay-detail__hint">{cfg.instructions}</p> : null}

          {/* QR Code Section */}
          {selected.method_type === 'qr' && (
            <div className="p-4 rounded-2xl bg-black/40 border border-cyan-500/30 text-center space-y-3 animate-fade-in">
              <div className="flex items-center justify-between text-xs px-1">
                <span className="text-white/60 font-display flex items-center gap-1.5">
                  <QrCode size={14} className="text-cyan-400" /> Scan to Pay
                </span>
                {total > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono font-bold">
                    Amount: ₹{total}
                  </span>
                )}
              </div>

              {/* QR Image Frame */}
              <div className="p-2.5 bg-white rounded-2xl shadow-xl shadow-cyan-950/40 inline-block mx-auto max-w-[240px] border-4 border-cyan-400/20">
                <img
                  src={activeQrSrc}
                  alt="UPI Payment QR code"
                  className="w-48 h-48 sm:w-52 sm:h-52 object-contain mx-auto rounded-lg"
                  onError={() => {
                    if (cfg.qr_image_url && !customQrFailed) {
                      setCustomQrFailed(true)
                    }
                  }}
                />
              </div>

              {/* Supported UPI Apps */}
              <p className="text-[11px] text-white/50 font-display">
                Supports <strong className="text-white">GPay</strong> · <strong className="text-white">PhonePe</strong> · <strong className="text-white">Paytm</strong> · <strong className="text-white">BHIM</strong> · <strong className="text-white">Cred</strong>
              </p>

              {/* 1-Tap Mobile UPI Intent Button */}
              {upiPayload && (
                <a
                  href={upiPayload}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-black font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-cyan-500/20"
                >
                  <Smartphone size={14} />
                  <span>Open UPI App (GPay / PhonePe / Paytm)</span>
                  <ArrowUpRight size={13} />
                </a>
              )}
            </div>
          )}

          {/* UPI ID Row */}
          {(selected.method_type === 'qr' || selected.method_type === 'upi') && effectiveUpiId ? (
            <div className="pay-copy-row">
              <span className="font-mono text-cyan-300 font-bold">{effectiveUpiId}</span>
              <button
                type="button"
                className="btn-outline coupon-apply-btn flex items-center gap-1"
                onClick={() => copy('UPI ID', effectiveUpiId)}
                aria-label="Copy UPI ID"
              >
                {copiedUpi ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                <span>{copiedUpi ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          ) : null}

          {/* Share QR */}
          {selected.method_type === 'qr' && (
            <button
              type="button"
              className="btn-outline w-full flex items-center justify-center gap-1.5 text-xs py-2"
              onClick={shareQr}
              aria-label="Share QR code"
            >
              <Share2 size={13} />
              <span>Share QR Link</span>
            </button>
          )}

          {/* Bank Transfer Details */}
          {selected.method_type === 'bank' ? (
            <div className="space-y-1.5 p-3 rounded-xl bg-black/40 border border-white/10 text-xs">
              {cfg.bank_name ? <p className="pay-bank-line"><strong>Bank:</strong> {cfg.bank_name}</p> : null}
              {cfg.account_name ? <p className="pay-bank-line"><strong>Name:</strong> {cfg.account_name}</p> : null}
              {cfg.account_number ? (
                <div className="pay-copy-row pt-1">
                  <span className="font-mono">{cfg.account_number}</span>
                  <button
                    type="button"
                    className="btn-outline coupon-apply-btn"
                    onClick={() => copy('Account Number', cfg.account_number)}
                    aria-label="Copy account number"
                  >
                    Copy
                  </button>
                </div>
              ) : null}
              {cfg.ifsc ? <p className="pay-bank-line font-mono"><strong>IFSC:</strong> {cfg.ifsc}</p> : null}
            </div>
          ) : null}

          {/* Payment Reference (UTR) */}
          {selected.method_type !== 'cash' && selected.method_type !== 'razorpay' ? (
            <div className="pt-1">
              <label className="field-label text-xs" htmlFor="pay-ref">
                Payment reference (optional)
              </label>
              <input
                id="pay-ref"
                className="input-dark text-xs"
                value={paymentRef}
                onChange={(e) => onPaymentRef(e.target.value)}
                placeholder="UTR / UPI Ref (e.g. 427819284719)"
                aria-label="Payment reference"
              />
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
