import { useMemo, useState } from 'react'
import { Ban, ShieldCheck } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../contexts/ToastContext'
import { AdminAction, AdminBadge, AdminConfirm, AdminEmpty, AdminSearch, matchesQuery } from './AdminShared'
import { ADMIN_ROLES, KYC_LABEL, KYC_OPTIONS, ROLE_LABEL, displayName, explainAdminError, formatDate } from './adminHelpers'

export default function AdminUsers({ users, patchUser, isSuperAdmin, currentUserId }) {
  const { showToast } = useToast()
  const [query, setQuery] = useState('')
  const [banTarget, setBanTarget] = useState(null)
  const [busy, setBusy] = useState(false)

  const filtered = useMemo(() => (
    users.filter((u) => matchesQuery([u.full_name, u.email, u.phone, u.location], query))
  ), [users, query])

  const updateUser = async (id, patch, okMsg) => {
    const { error } = await supabase
      .from('profiles')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) {
      showToast(explainAdminError(error), 'error')
      return
    }
    patchUser(id, patch)
    showToast(okMsg, 'success')
  }

  const handleKyc = async (user, kycStatus) => {
    if (kycStatus === 'verified' || kycStatus === 'rejected') {
      const { data } = await supabase
        .from('kyc_submissions')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'submitted')
        .maybeSingle()
      if (data?.id) {
        const { error } = await supabase.rpc('review_kyc', {
          p_submission_id: data.id,
          p_status: kycStatus,
          p_note: kycStatus === 'rejected' ? 'Rejected from users tab' : null,
        })
        if (!error) {
          patchUser(user.id, { kyc_status: kycStatus })
          showToast(`KYC set to ${KYC_LABEL[kycStatus]}`, 'success')
          return
        }
      }
    }
    updateUser(user.id, { kyc_status: kycStatus }, `KYC set to ${KYC_LABEL[kycStatus]}`)
  }

  const handleRole = (user, adminRole) => {
    const isAdmin = adminRole === 'admin' || adminRole === 'super_admin'
    updateUser(user.id, { admin_role: adminRole, is_admin: isAdmin }, `${displayName(user)} is now ${ROLE_LABEL[adminRole]}`)
  }

  const confirmBan = async () => {
    if (!banTarget) return
    setBusy(true)
    const nextBanned = !banTarget.is_banned
    await updateUser(
      banTarget.id,
      { is_banned: nextBanned },
      nextBanned ? `${displayName(banTarget)} banned` : `${displayName(banTarget)} restored`
    )
    setBusy(false)
    setBanTarget(null)
  }

  return (
    <div>
      <div className="admin-toolbar">
        <AdminSearch
          value={query}
          onChange={setQuery}
          placeholder="Search name, email, phone…"
          ariaLabel="Search onboarded users"
        />
        <p className="admin-muted">{filtered.length} user{filtered.length === 1 ? '' : 's'}</p>
      </div>

      {filtered.length === 0 ? (
        <AdminEmpty emoji="👤" title="No users found" body="Onboarded accounts show here." />
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>User</th>
                <th>KYC</th>
                <th>Role</th>
                <th>Joined</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((user) => {
                const isSelf = user.id === currentUserId
                return (
                  <tr key={user.id}>
                    <td>
                      <span className="admin-cell-title">{displayName(user)}</span>
                      <span className="admin-cell-sub">{user.email || '—'} · {user.phone || 'no phone'}</span>
                    </td>
                    <td>
                      <label className="sr-only" htmlFor={`kyc-${user.id}`}>KYC status for {displayName(user)}</label>
                      <select
                        id={`kyc-${user.id}`}
                        className="select-dark admin-select"
                        value={user.kyc_status || 'pending'}
                        aria-label={`KYC status for ${displayName(user)}`}
                        title="Change KYC status"
                        onChange={(e) => handleKyc(user, e.target.value)}
                      >
                        {KYC_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>{KYC_LABEL[opt]}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      {isSuperAdmin && !isSelf ? (
                        <select
                          className="select-dark admin-select"
                          value={user.admin_role || (user.is_admin ? 'super_admin' : 'none')}
                          aria-label={`Admin role for ${displayName(user)}`}
                          title="Change admin role"
                          onChange={(e) => handleRole(user, e.target.value)}
                        >
                          {ADMIN_ROLES.map((opt) => (
                            <option key={opt} value={opt}>{ROLE_LABEL[opt]}</option>
                          ))}
                        </select>
                      ) : (
                        <AdminBadge kind={user.admin_role || (user.is_admin ? 'super_admin' : 'none')}>
                          {ROLE_LABEL[user.admin_role] || (user.is_admin ? 'Overall Admin' : 'User')}
                        </AdminBadge>
                      )}
                    </td>
                    <td>{formatDate(user.created_at)}</td>
                    <td>
                      {user.is_banned
                        ? <AdminBadge kind="banned">Banned</AdminBadge>
                        : <AdminBadge kind="live">Active</AdminBadge>}
                    </td>
                    <td>
                      <div className="admin-actions">
                        {user.kyc_status !== 'verified' ? (
                          <AdminAction
                            tip="Verify KYC"
                            ariaLabel={`Verify ${displayName(user)}`}
                            on
                            onClick={() => handleKyc(user, 'verified')}
                          >
                            <ShieldCheck size={14} />
                          </AdminAction>
                        ) : null}
                        <AdminAction
                          tip={user.is_banned ? 'Restore user' : 'Ban user'}
                          ariaLabel={user.is_banned ? `Restore ${displayName(user)}` : `Ban ${displayName(user)}`}
                          danger
                          disabled={isSelf}
                          onClick={() => setBanTarget(user)}
                        >
                          <Ban size={14} />
                        </AdminAction>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {banTarget ? (
        <AdminConfirm
          title={banTarget.is_banned ? 'Restore user?' : 'Ban user?'}
          body={banTarget.is_banned
            ? `${displayName(banTarget)} can list and book again.`
            : `${displayName(banTarget)} cannot list or book while banned.`}
          confirmLabel={banTarget.is_banned ? 'Restore' : 'Ban user'}
          loading={busy}
          onConfirm={confirmBan}
          onCancel={() => setBanTarget(null)}
        />
      ) : null}
    </div>
  )
}
