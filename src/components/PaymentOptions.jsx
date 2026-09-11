import { methodConfig } from '../lib/payments'
import { useToast } from '../contexts/ToastContext'
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
}) {
  const { showToast } = useToast()
  const selected = methods.find((m) => m.id === selectedId)
  const cfg = methodConfig(selected)

  const copy = async (label, value) => {
    if (!value) return
    try {
      await copyText(value)
      showToast(`${label} copied`, 'success')
    } catch {
      showToast('Copy failed', 'error')
    }
  }

  const shareQr = async () => {
    const url = cfg.qr_image_url
    if (!url) return
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Pay लोकल Den',
          text: cfg.upi_id ? `UPI ${cfg.upi_id}` : 'Scan QR to pay',
          url,
        })
        return
      }
      await copyText(url)
      showToast('QR link copied', 'success')
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
        <div className="pay-detail">
          {cfg.instructions ? <p className="pay-detail__hint">{cfg.instructions}</p> : null}

          {selected.method_type === 'qr' && cfg.qr_image_url ? (
            <img src={cfg.qr_image_url} alt="Payment QR code" className="pay-qr" />
          ) : null}

          {(selected.method_type === 'qr' || selected.method_type === 'upi') && cfg.upi_id ? (
            <div className="pay-copy-row">
              <span>{cfg.upi_id}</span>
              <button type="button" className="btn-outline coupon-apply-btn" onClick={() => copy('UPI ID', cfg.upi_id)} aria-label="Copy UPI ID">
                Copy
              </button>
            </div>
          ) : null}

          {selected.method_type === 'qr' && cfg.qr_image_url ? (
            <button type="button" className="btn-outline w-full" onClick={shareQr} aria-label="Share QR code">
              Share QR
            </button>
          ) : null}

          {selected.method_type === 'bank' ? (
            <div>
              {cfg.bank_name ? <p className="pay-bank-line"><strong>Bank:</strong> {cfg.bank_name}</p> : null}
              {cfg.account_name ? <p className="pay-bank-line"><strong>Name:</strong> {cfg.account_name}</p> : null}
              {cfg.account_number ? (
                <div className="pay-copy-row">
                  <span>{cfg.account_number}</span>
                  <button type="button" className="btn-outline coupon-apply-btn" onClick={() => copy('Account', cfg.account_number)} aria-label="Copy account number">
                    Copy
                  </button>
                </div>
              ) : null}
              {cfg.ifsc ? <p className="pay-bank-line"><strong>IFSC:</strong> {cfg.ifsc}</p> : null}
            </div>
          ) : null}

          {selected.method_type !== 'cash' && selected.method_type !== 'razorpay' ? (
            <div>
              <label className="field-label" htmlFor="pay-ref">Payment reference (optional)</label>
              <input
                id="pay-ref"
                className="input-dark"
                value={paymentRef}
                onChange={(e) => onPaymentRef(e.target.value)}
                placeholder="UTR / UPI ref"
                aria-label="Payment reference"
              />
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
