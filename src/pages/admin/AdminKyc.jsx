import { useMemo, useState } from 'react'
import { Check, Eye, X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../contexts/ToastContext'
import { AdminBadge, AdminEmpty, AdminSearch, matchesQuery } from './AdminShared'
import { KYC_LABEL, displayName, explainAdminError, formatDate } from './adminHelpers'

const FILTERS = ['submitted', 'rejected', 'verified', 'all']

export default function AdminKyc({ submissions, patchSubmission, patchUser }) {
  const { showToast } = useToast()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('submitted')
  const [note, setNote] = useState('')
  const [busyId, setBusyId] = useState('')
  const [preview, setPreview] = useState(null)

  const rows = useMemo(() => {
    return submissions.filter((row) => {
      if (filter !== 'all' && row.status !== filter) return false
      return matchesQuery([
        row.full_name,
        row.phone,
        row.id_type,
        row.id_last4,
        row.profiles?.email,
        row.profiles?.full_name,
      ], query)
    })
  }, [submissions, filter, query])

  const openDoc = async (path, label) => {
    const { data, error } = await supabase.storage.from('kyc-docs').createSignedUrl(path, 120)
    if (error || !data?.signedUrl) {
      showToast(error?.message || 'Could not open document. Check the kyc-docs bucket.', 'error')
      return
    }
    setPreview({ url: data.signedUrl, label })
  }

  const review = async (row, status) => {
    if (status === 'rejected' && !note.trim()) {
      showToast('Add a reject note so they know what to fix.', 'error')
      return
    }
    setBusyId(row.id)
    const { error } = await supabase.rpc('review_kyc', {
      p_submission_id: row.id,
      p_status: status,
      p_note: note.trim() || null,
    })
    if (error) {
      showToast(explainAdminError(error), 'error')
      setBusyId('')
      return
    }
    const patch = {
      status,
      reviewer_note: note.trim() || null,
      reviewed_at: new Date().toISOString(),
    }
    patchSubmission(row.id, patch)
    patchUser(row.user_id, { kyc_status: status, kyc_note: patch.reviewer_note, aadhaar_last4: row.id_last4 })
    setNote('')
    setBusyId('')
    showToast(status === 'verified' ? `${displayName(row.profiles, row.full_name)} verified` : 'KYC rejected', 'success')
  }

  return (
    <div>
      <div className="admin-toolbar">
        <AdminSearch
          value={query}
          onChange={setQuery}
          placeholder="Search name, phone, last 4…"
          ariaLabel="Search KYC submissions"
        />
        <div className="admin-kyc-filters" role="group" aria-label="Filter KYC status">
          {FILTERS.map((item) => (
            <button
              key={item}
              type="button"
              className={filter === item ? 'is-on' : ''}
              onClick={() => setFilter(item)}
              aria-pressed={filter === item}
            >
              {item === 'all' ? 'All' : KYC_LABEL[item]}
            </button>
          ))}
        </div>
        <p className="admin-muted">{rows.length} on this filter</p>
      </div>

      <label className="field-label" htmlFor="kyc-admin-note">Reject note (required to reject)</label>
      <input
        id="kyc-admin-note"
        className="input-dark admin-kyc-note"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Blurry selfie, name mismatch, expired ID…"
        aria-label="KYC reject note"
      />

      {rows.length === 0 ? (
        <AdminEmpty emoji="🪪" title="No KYC here" body="Submitted docs land in this queue." />
      ) : (
        <div className="admin-kyc-list">
          {rows.map((row) => (
            <article key={row.id} className="admin-card admin-kyc-card">
              <div className="admin-kyc-card__top">
                <div>
                  <div className="admin-cell-title">{displayName(row.profiles, row.full_name)}</div>
                  <span className="admin-cell-sub">
                    {row.profiles?.email || '—'} · {row.phone || 'no phone'} · {row.id_type} ·••{row.id_last4}
                  </span>
                </div>
                <AdminBadge kind={row.status}>{KYC_LABEL[row.status]}</AdminBadge>
              </div>
              <p className="admin-muted">Sent {formatDate(row.submitted_at)}</p>
              {row.reviewer_note ? <p className="admin-kyc-card__note">{row.reviewer_note}</p> : null}
              <div className="admin-actions">
                <button type="button" className="btn-outline" onClick={() => openDoc(row.id_doc_path, 'ID')} aria-label="View ID photo">
                  <Eye size={14} /> ID
                </button>
                <button type="button" className="btn-outline" onClick={() => openDoc(row.selfie_path, 'Selfie')} aria-label="View selfie">
                  <Eye size={14} /> Selfie
                </button>
                {row.status === 'submitted' ? (
                  <>
                    <button
                      type="button"
                      className="btn-primary"
                      disabled={busyId === row.id}
                      onClick={() => review(row, 'verified')}
                      aria-label={`Verify ${row.full_name}`}
                    >
                      <Check size={14} /> Verify
                    </button>
                    <button
                      type="button"
                      className="btn-outline"
                      disabled={busyId === row.id}
                      onClick={() => review(row, 'rejected')}
                      aria-label={`Reject ${row.full_name}`}
                    >
                      <X size={14} /> Reject
                    </button>
                  </>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}

      {preview ? (
        <button type="button" className="admin-kyc-lightbox" onClick={() => setPreview(null)} aria-label="Close KYC photo">
          <img src={preview.url} alt={preview.label} />
        </button>
      ) : null}
    </div>
  )
}
