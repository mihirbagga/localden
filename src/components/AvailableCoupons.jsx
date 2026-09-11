import { formatCouponValue, couponLockReason } from '../lib/coupons'
import '../pages/couponApply.css'

function endsLabel(coupon) {
  if (!coupon.ends_at) return null
  const d = new Date(coupon.ends_at)
  if (Number.isNaN(d.getTime())) return null
  return `Till ${d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`
}

export default function AvailableCoupons({
  coupons,
  subtotal = 0,
  selectedId,
  onPick,
  mode = 'apply',
  hideLabel = false,
  userId,
}) {
  if (!coupons?.length) return null

  return (
    <div className="coupon-list" role="list" aria-label="Your coupons">
      {hideLabel ? null : <p className="field-label">Your coupons</p>}
      {coupons.map((coupon) => {
        const lock = mode === 'apply' ? couponLockReason(coupon, subtotal, userId) : null
        const selected = selectedId === coupon.id
        const ends = endsLabel(coupon)
        return (
          <div
            key={coupon.id}
            className={`coupon-offer${selected ? ' is-on' : ''}${lock ? ' is-locked' : ''}`}
            role="listitem"
          >
            <div className="coupon-offer__main">
              <span className="coupon-offer__code">{coupon.code}</span>
              <span className="coupon-offer__off">{formatCouponValue(coupon)} off</span>
              {coupon.description ? (
                <p className="coupon-offer__desc">{coupon.description}</p>
              ) : null}
              <p className="coupon-offer__meta">
                {lock && !selected
                  ? lock
                  : `${coupon.min_subtotal > 0 ? `Min ₹${coupon.min_subtotal}` : 'No min'}${ends ? ` · ${ends}` : ''}`}
              </p>
            </div>
            {mode === 'apply' ? (
              <button
                type="button"
                className="btn-outline coupon-offer__btn"
                disabled={Boolean(lock) || selected}
                onClick={() => onPick?.(coupon)}
                aria-label={selected ? `${coupon.code} applied` : `Apply coupon ${coupon.code}`}
              >
                {selected ? 'Applied' : lock ? 'Locked' : 'Apply'}
              </button>
            ) : (
              <button
                type="button"
                className="btn-outline coupon-offer__btn"
                onClick={() => onPick?.(coupon)}
                aria-label={`Copy coupon ${coupon.code}`}
              >
                Copy
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}
