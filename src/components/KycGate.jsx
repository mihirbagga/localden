import { Link } from 'react-router-dom'
import { Shield } from 'lucide-react'
import { kycActionLabel } from '../lib/kyc'
import '../pages/kyc.css'

export default function KycGate({ status, action = 'continue', from }) {
  const to = from ? { pathname: '/kyc', state: { from } } : '/kyc'
  return (
    <div className="kyc-gate glass">
      <div className="kyc-gate__icon" aria-hidden="true"><Shield size={28} /></div>
      <h2>KYC required</h2>
      <p>
        {status === 'submitted'
          ? 'Admin is reviewing your Aadhaar/PAN and selfie. You can rent or list after they verify you.'
          : `Verify with Aadhaar or PAN and a selfie before you ${action}. Last 4 digits only — not the full ID.`}
      </p>
      <Link to={to} className="btn-primary" aria-label={kycActionLabel(status)}>
        {kycActionLabel(status)}
      </Link>
    </div>
  )
}
