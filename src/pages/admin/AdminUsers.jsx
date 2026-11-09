import { useMemo, useState, useEffect } from 'react'
import { Ban, ShieldCheck, ShieldAlert, MessageSquare, Send, Copy, ExternalLink, Bell, X, CheckCheck, MapPin, Building2, Sliders, Trash2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../contexts/ToastContext'
import { AdminAction, AdminBadge, AdminConfirm, AdminEmpty, AdminSearch, matchesQuery } from './AdminShared'
import { ADMIN_ROLES, KYC_LABEL, KYC_OPTIONS, ROLE_LABEL, displayName, explainAdminError, formatDate } from './adminHelpers'
import { buildWhatsAppLink, cleanPhoneNumber, formatWelcomeUserMessage, sendWelcomeUserNotification } from '../../lib/whatsappSmsService'
import { fetchCities } from '../../lib/citiesService'
import { fetchHubs } from '../../lib/hubService'
import { logAuditEvent } from '../../lib/auditService'
import AccountDeletionModal from '../../components/AccountDeletionModal'

export default function AdminUsers({ users, patchUser, removeUser, isSuperAdmin, currentUserId }) {
  const { showToast } = useToast()
  const [query, setQuery] = useState('')
  const [userFilter, setUserFilter] = useState('all')
  const [banTarget, setBanTarget] = useState(null)
  const [welcomeTarget, setWelcomeTarget] = useState(null)
  const [welcomePhone, setWelcomePhone] = useState('')
  const [sendingWelcome, setSendingWelcome] = useState(false)
  const [busy, setBusy] = useState(false)

  // Regional & Hub Scoping
  const [availableCities, setAvailableCities] = useState([])
  const [availableHubs, setAvailableHubs] = useState([])
  const [scopeModalUser, setScopeModalUser] = useState(null)
  const [savingScope, setSavingScope] = useState(false)
  const [deleteAccountTarget, setDeleteAccountTarget] = useState(null)

  useEffect(() => {
    fetchCities().then(setAvailableCities).catch(() => {})
    fetchHubs().then(setAvailableHubs).catch(() => {})
  }, [])

  const filtered = useMemo(() => (
    users.filter((u) => {
      if (userFilter === 'kyc_submitted' && u.kyc_status !== 'submitted') return false
      if (userFilter === 'verified' && u.kyc_status !== 'verified') return false
      if (userFilter === 'admins' && !(u.is_admin || ['admin', 'super_admin', 'regional_admin', 'hub_manager'].includes(u.admin_role))) return false
      if (userFilter === 'banned' && !u.is_banned) return false
      if (userFilter === 'deletion_requests' && !u.deletion_requested_at && !u.deleted_at) return false
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
    const isAdmin = ['admin', 'super_admin', 'regional_admin', 'hub_manager'].includes(adminRole)
    updateUser(user.id, { admin_role: adminRole, is_admin: isAdmin }, `${displayName(user)} is now ${ROLE_LABEL[adminRole]}.`)
    logAuditEvent({
      action: 'user.role_changed',
      entityType: 'user',
      entityId: user.id,
      beforeData: { admin_role: user.admin_role, is_admin: user.is_admin },
      afterData: { admin_role: adminRole, is_admin: isAdmin },
    })

    if (adminRole === 'regional_admin' || adminRole === 'hub_manager') {
      setScopeModalUser({
        user,
        adminRole,
        assignedCities: Array.isArray(user.assigned_cities) ? user.assigned_cities : [],
        assignedHubId: user.assigned_hub_id || '',
      })
    }
  }

  const handleSaveScope = async (e) => {
    e.preventDefault()
    if (!scopeModalUser) return
    setSavingScope(true)
    try {
      const patch = {}
      if (scopeModalUser.adminRole === 'regional_admin') {
        patch.assigned_cities = scopeModalUser.assignedCities
      } else if (scopeModalUser.adminRole === 'hub_manager') {
        patch.assigned_hub_id = scopeModalUser.assignedHubId || null
      }
      await updateUser(scopeModalUser.user.id, patch, `Scope updated for ${displayName(scopeModalUser.user)}.`)
      setScopeModalUser(null)
    } finally {
      setSavingScope(false)
    }
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
            { id: 'deletion_requests', label: 'Deletion Requests' },
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
                      <div className="space-y-1">
                        {isSuperAdmin && !isSelf ? (
                          <select
                            className="select-dark admin-select text-xs py-1"
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

                        {/* Regional / Hub details pill */}
                        {user.admin_role === 'regional_admin' && (
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-cyan-300 font-mono">
                              {user.assigned_cities?.length
                                ? `${user.assigned_cities.length} ${user.assigned_cities.length === 1 ? 'city' : 'cities'}`
                                : 'No cities'}
                            </span>
                            {isSuperAdmin && (
                              <button
                                type="button"
                                onClick={() =>
                                  setScopeModalUser({
                                    user,
                                    adminRole: 'regional_admin',
                                    assignedCities: Array.isArray(user.assigned_cities)
                                      ? user.assigned_cities
                                      : [],
                                    assignedHubId: '',
                                  })
                                }
                                className="text-[10px] text-cyan-400 hover:text-cyan-200 underline font-bold"
                              >
                                Edit
                              </button>
                            )}
                          </div>
                        )}

                        {user.admin_role === 'hub_manager' && (
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-emerald-300 font-mono truncate max-w-[120px]">
                              {availableHubs.find((h) => h.id === user.assigned_hub_id)?.name || 'Unlinked Hub'}
                            </span>
                            {isSuperAdmin && (
                              <button
                                type="button"
                                onClick={() =>
                                  setScopeModalUser({
                                    user,
                                    adminRole: 'hub_manager',
                                    assignedCities: [],
                                    assignedHubId: user.assigned_hub_id || '',
                                  })
                                }
                                className="text-[10px] text-emerald-400 hover:text-emerald-200 underline font-bold"
                              >
                                Edit
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                    <td>{formatDate(user.created_at)}</td>
                    <td>
                      {user.deleted_at ? (
                        <AdminBadge kind="banned">Deleted</AdminBadge>
                      ) : user.deletion_requested_at ? (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-300 border border-red-500/30">
                          Delete Req
                        </span>
                      ) : user.is_banned ? (
                        <AdminBadge kind="banned">Banned</AdminBadge>
                      ) : (
                        <AdminBadge kind="live">Active</AdminBadge>
                      )}
                    </td>
                    <td>
                      <div className="admin-actions">
                        <AdminAction
                          tip="Send welcome message"
                          ariaLabel={`Send welcome message to ${displayName(user)}`}
                          onClick={() => {
                            setWelcomeTarget(user)
                            setWelcomePhone(user.phone || '')
                          }}
                        >
                          <MessageSquare size={14} style={{ color: '#00e5ff' }} />
                        </AdminAction>
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
                        {isSuperAdmin && !isSelf && (
                          <AdminAction
                            tip="Purge / Delete Account"
                            ariaLabel={`Purge account for ${displayName(user)}`}
                            danger
                            onClick={() => setDeleteAccountTarget(user)}
                          >
                            <Trash2 size={13} style={{ color: '#ff2e6d' }} />
                          </AdminAction>
                        )}
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

      {welcomeTarget ? (() => {
        const message = formatWelcomeUserMessage({ user: welcomeTarget, couponCode: 'WELCOME10', discountPercent: 10 })
        const clean = cleanPhoneNumber(welcomePhone)
        const waLink = buildWhatsAppLink(clean, message)

        const handleCopy = () => {
          navigator.clipboard.writeText(message).then(() => {
            showToast('Welcome message copied to clipboard!', 'success')
          })
        }

        const handleSendInApp = async () => {
          setSendingWelcome(true)
          try {
            await sendWelcomeUserNotification({ user: welcomeTarget, customPhone: welcomePhone })
            showToast(`In-app welcome alert dispatched to ${displayName(welcomeTarget)}!`, 'success')
          } catch (err) {
            showToast(err.message || 'Failed to dispatch in-app notification', 'error')
          } finally {
            setSendingWelcome(false)
          }
        }

        const handleOpenWhatsApp = async () => {
          if (!clean || clean.length < 10) {
            showToast('Enter a valid 10-digit phone number first.', 'error')
            return
          }
          window.open(waLink, '_blank')
          showToast(`Opening WhatsApp chat with ${displayName(welcomeTarget)}…`, 'success')
        }

        return (
          <div className="admin-confirm-backdrop" onClick={() => setWelcomeTarget(null)} role="presentation">
            <div
              className="admin-confirm"
              style={{ maxWidth: '32rem', textAlign: 'left' }}
              role="dialog"
              aria-modal="true"
              onClick={(e) => e.stopPropagation()}
            >
              <AdminAction tip="Close" ariaLabel="Close dialog" onClick={() => setWelcomeTarget(null)}>
                <X size={14} />
              </AdminAction>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
                <span style={{ fontSize: '1.4rem' }}>🎉</span>
                <h2 className="admin-confirm__title" style={{ margin: 0, textAlign: 'left' }}>
                  WELCOME MESSAGE
                </h2>
              </div>

              <p className="admin-muted" style={{ fontSize: '0.82rem', marginBottom: '1rem' }}>
                Send a personalized welcome gift and onboarding greeting to <strong>{displayName(welcomeTarget)}</strong> ({welcomeTarget.email || 'no email'}).
              </p>

              <div style={{ marginBottom: '1rem' }}>
                <label className="field-label" style={{ fontSize: '0.75rem', marginBottom: '0.3rem', display: 'block' }}>
                  WhatsApp / Phone Number
                </label>
                <input
                  type="tel"
                  className="input-dark"
                  value={welcomePhone}
                  onChange={(e) => setWelcomePhone(e.target.value)}
                  placeholder="e.g. 9876543210 (10 digits)"
                  style={{ width: '100%', fontSize: '0.9rem' }}
                />
              </div>

              <div style={{ marginBottom: '1.2rem' }}>
                <label className="field-label" style={{ fontSize: '0.75rem', marginBottom: '0.3rem', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Message Preview</span>
                  <button
                    type="button"
                    onClick={handleCopy}
                    style={{ background: 'none', border: 'none', color: '#00e5ff', cursor: 'pointer', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                  >
                    <Copy size={12} /> Copy Text
                  </button>
                </label>
                <textarea
                  className="input-dark"
                  readOnly
                  rows={8}
                  value={message}
                  style={{ width: '100%', fontSize: '0.78rem', lineHeight: '1.4', background: 'rgba(0,0,0,0.45)', color: 'rgba(255,255,255,0.85)', resize: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                <div style={{ display: 'flex', gap: '0.6rem' }}>
                  <button
                    type="button"
                    className="btn-primary"
                    style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', fontSize: '0.85rem', padding: '0.6rem 1rem' }}
                    onClick={handleOpenWhatsApp}
                  >
                    <MessageSquare size={14} /> Open in WhatsApp
                  </button>
                  <button
                    type="button"
                    className="btn-outline"
                    style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', fontSize: '0.85rem', padding: '0.6rem 1rem' }}
                    onClick={handleSendInApp}
                    disabled={sendingWelcome}
                  >
                    <Bell size={14} /> {sendingWelcome ? 'Sending…' : 'Send In-App Alert'}
                  </button>
                </div>
                <button
                  type="button"
                  className="admin-filter-chip"
                  style={{ alignSelf: 'center', marginTop: '0.2rem', cursor: 'pointer' }}
                  onClick={() => setWelcomeTarget(null)}
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )
      })() : null}

      {/* REGIONAL / HUB SCOPE MODAL */}
      {scopeModalUser && (
        <div
          className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setScopeModalUser(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-md bg-[#0e121d] border border-white/15 rounded-2xl p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div>
                <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                  {scopeModalUser.adminRole === 'regional_admin' ? (
                    <>
                      <MapPin size={16} className="text-cyan-400" />
                      Assign Operating Cities
                    </>
                  ) : (
                    <>
                      <Building2 size={16} className="text-emerald-400" />
                      Assign Dispatch Hub
                    </>
                  )}
                </h3>
                <p className="text-xs text-white/50 mt-0.5">
                  User: <span className="text-white font-semibold">{displayName(scopeModalUser.user)}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setScopeModalUser(null)}
                className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white flex items-center justify-center"
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleSaveScope} className="space-y-4">
              {scopeModalUser.adminRole === 'regional_admin' ? (
                <div>
                  <label className="text-[11px] font-bold text-white/70 block mb-2">
                    Select cities under this Regional Admin&apos;s jurisdiction:
                  </label>
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {availableCities.map((city) => {
                      const isChecked = scopeModalUser.assignedCities.includes(city.name)
                      return (
                        <label
                          key={city.id}
                          className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-all ${
                            isChecked
                              ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-200'
                              : 'bg-black/30 border-white/10 text-white/70 hover:bg-white/5'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                const next = e.target.checked
                                  ? [...scopeModalUser.assignedCities, city.name]
                                  : scopeModalUser.assignedCities.filter((c) => c !== city.name)
                                setScopeModalUser({ ...scopeModalUser, assignedCities: next })
                              }}
                              className="w-4 h-4 rounded text-cyan-500 bg-black/40 border-white/20"
                            />
                            <div>
                              <span className="font-bold text-xs block text-white">{city.name}</span>
                              <span className="text-[10px] text-white/40">{city.state || 'India'}</span>
                            </div>
                          </div>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 text-white/50">
                            {city.popular_localities?.length || 0} areas
                          </span>
                        </label>
                      )
                    })}
                  </div>
                </div>
              ) : (
                <div>
                  <label className="text-[11px] font-bold text-white/70 block mb-2">
                    Select Dispatch Hub station managed by this user:
                  </label>
                  <select
                    value={scopeModalUser.assignedHubId}
                    onChange={(e) =>
                      setScopeModalUser({ ...scopeModalUser, assignedHubId: e.target.value })
                    }
                    className="select-dark w-full text-xs py-2.5 px-3 rounded-xl bg-black/40 border border-white/15 text-white"
                  >
                    <option value="">— Unlinked / Roaming Manager —</option>
                    {availableHubs.map((hub) => (
                      <option key={hub.id} value={hub.id}>
                        {hub.name} ({hub.city})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="pt-3 flex justify-end gap-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setScopeModalUser(null)}
                  className="btn-outline text-xs px-4 py-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingScope}
                  className="btn-primary text-xs px-4 py-2"
                >
                  {savingScope ? 'Saving…' : 'Save Scope'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADMIN ACCOUNT DELETION / PURGE MODAL */}
      {deleteAccountTarget && (
        <AccountDeletionModal
          user={deleteAccountTarget}
          isAdmin={true}
          onClose={() => setDeleteAccountTarget(null)}
          onDeleted={(id) => {
            if (removeUser) {
              removeUser(id)
            } else {
              patchUser(id, {
                is_banned: true,
                deleted_at: new Date().toISOString(),
                full_name: 'Deleted User',
                phone: null,
              })
            }
          }}
        />
      )}
    </div>
  )
}
