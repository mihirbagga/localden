import { useMemo, useState } from 'react'
import { Ban, ShieldCheck, ShieldAlert } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../contexts/ToastContext'
import { AdminAction, AdminBadge, AdminConfirm, AdminEmpty, AdminSearch, matchesQuery } from './AdminShared'
import { ADMIN_ROLES, KYC_LABEL, KYC_OPTIONS, ROLE_LABEL, displayName, explainAdminError, formatDate } from './adminHelpers'

export default function AdminUsers({ users, patchUser, isSuperAdmin, currentUserId }) {
  const { showToast } = useToast()
  const [query, setQuery] = useState('')
  const [userFilter, setUserFilter] = useState('all')
  const [banTarget, setBanTarget] = useState(null)
  const [busy, setBusy] = useState(false)

  const filtered = useMemo(() => (
    users.filter((u) => {
      if (userFilter === 'kyc_submitted' && u.kyc_status !== 'submitted') return false
      if (userFilter === 'verified' && u.kyc_status !== 'verified') return false
      if (userFilter === 'admins' && !(u.is_admin || u.admin_role === 'admin' || u.admin_role === 'super_admin')) return false
      if (userFilter === 'banned' && !u.is_banned) return false
      return matchesQuery([u.full_name, u.email, u.phone, u.location], query)
    })
  ), [users, query, userFilter])

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
          showToast(`KYC status updated to ${KYC_LABEL[kycStatus]}.`, 'success')
          return
        }
      }
    }
    await updateUser(user.id, { kyc_status: kycStatus }, `KYC status updated to ${KYC_LABEL[kycStatus] || kycStatus}.`)
    if (kycStatus === 'required') {
      await supabase.rpc('push_notification', {
        p_user_id: user.id,
        p_booking_id: null,
        p_kind: 'kyc_requested',
        p_title: 'KYC Verification Required',
        p_body: 'Please complete your quick ID verification in your Dashboard to continue booking and listing.',
        p_link: '/kyc',
      }).catch(() => {})
    }
  }

  const handleRole = (user, adminRole) => {
    const isAdmin = adminRole === 'admin' || adminRole === 'super_admin'
    updateUser(user.id, { admin_role: adminRole, is_admin: isAdmin }, `${displayName(user)} is now ${ROLE_LABEL[adminRole]}.`)
  }

  const confirmBan = async () => {
    if (!banTarget) return
    setBusy(true)
    const nextBanned = !banTarget.is_banned
    await updateUser(
      banTarget.id,
      { is_banned: nextBanned },
      nextBanned ? `${displayName(banTarget)} has been suspended.` : `${displayName(banTarget)}'s account has been restored.`
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
          placeholder="Search name, email, phone, location…"
          ariaLabel="Search onboarded users"
        />
        <div className="admin-filter-chips" role="group" aria-label="Filter users">
          {[
            { id: 'all', label: 'All Members' },
            { id: 'kyc_submitted', label: 'KYC Submitted' },
            { id: 'verified', label: 'KYC Verified' },
            { id: 'admins', label: 'Admins' },
            { id: 'banned', label: 'Banned' },
          ].map((chip) => (
            <button
              key={chip.id}
              type="button"
              onClick={() => setUserFilter(chip.id)}
              className={`admin-filter-chip${userFilter === chip.id ? ' is-on' : ''}`}
            >
              {chip.label}
            </button>
          ))}
        </div>
        <p className="admin-muted">{filtered.length} user{filtered.length === 1 ? '' : 's'}</p>
      </div>

      {filtered.length === 0 ? (
        <AdminEmpty
          emoji="👤"
          title="No matching users"
          body={userFilter !== 'all' || query ? 'Try clearing your search or switching the filter chip above.' : 'Onboarded community accounts appear here.'}
        />
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
                        {user.kyc_status !== 'verified' && user.kyc_status !== 'required' && user.kyc_status !== 'submitted' ? (
                          <AdminAction
                            tip="Request KYC"
                            ariaLabel={`Request KYC from ${displayName(user)}`}
                            onClick={() => handleKyc(user, 'required')}
                          >
                            <ShieldAlert size={14} style={{ color: '#ff8c00' }} />
                          </AdminAction>
                        ) : null}
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
