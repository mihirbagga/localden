import { useMemo, useState } from 'react'
import { Eye, EyeOff, Pencil, Star, Shield, Trash2, ToggleLeft, ToggleRight, Send, MessageSquare, Copy, Bell, X, Instagram, Share2, Download, ExternalLink } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../contexts/ToastContext'
import { AdminAction, AdminBadge, AdminConfirm, AdminEmpty, AdminSearch, matchesQuery } from './AdminShared'
import { displayName, explainAdminError } from './adminHelpers'
import { buildWhatsAppLink, cleanPhoneNumber, formatListingLiveMessage, sendListingLiveNotification } from '../../lib/whatsappSmsService'
import { formatInstagramListingPost, formatInstagramStoryCopy } from '../../lib/instagramListingAd'

export default function AdminListings({ listings, patchListing, removeListing }) {
  const { showToast } = useToast()
  const [query, setQuery] = useState('')
  const [viewFilter, setViewFilter] = useState('all')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [liveAlertTarget, setLiveAlertTarget] = useState(null)
  const [liveAlertPhone, setLiveAlertPhone] = useState('')
  const [sendingLiveAlert, setSendingLiveAlert] = useState(false)
  const [igTarget, setIgTarget] = useState(null)
  const [busy, setBusy] = useState(false)

  const filtered = useMemo(() => (
    listings.filter((l) => {
      const published = l.is_published !== false
      if (viewFilter === 'live' && (!published || !l.is_available)) return false
      if (viewFilter === 'hidden' && published) return false
      if (viewFilter === 'featured' && !l.is_featured) return false
      if (viewFilter === 'unverified' && l.is_verified) return false
      return matchesQuery([l.title, l.location, l.subcategory, l.brand, l.profiles?.full_name], query)
    })
  ), [listings, query, viewFilter])

  const updateListing = async (listing, patch, okMsg) => {
    const { error } = await supabase
      .from('listings')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', listing.id)
    if (error) {
      showToast(explainAdminError(error), 'error')
      return
    }
    patchListing(listing.id, patch)
    showToast(okMsg, 'success')
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setBusy(true)
    const { error } = await supabase.from('listings').delete().eq('id', deleteTarget.id)
    setBusy(false)
    if (error) {
      showToast(explainAdminError(error), 'error')
      return
    }
    removeListing(deleteTarget.id)
    showToast('Listing permanently removed from the catalog.', 'success')
    setDeleteTarget(null)
  }

  return (
    <div>
      <div className="admin-toolbar">
        <AdminSearch
          value={query}
          onChange={setQuery}
          placeholder="Search gear title, lister, brand, location…"
          ariaLabel="Search listings"
        />
        <div className="admin-filter-chips" role="group" aria-label="Filter listings">
          {[
            { id: 'all', label: 'All Gear' },
            { id: 'live', label: 'Live & Bookable' },
            { id: 'featured', label: 'Featured' },
            { id: 'unverified', label: 'Unverified' },
            { id: 'hidden', label: 'Hidden' },
          ].map((chip) => (
            <button
              key={chip.id}
              type="button"
              onClick={() => setViewFilter(chip.id)}
              className={`admin-filter-chip${viewFilter === chip.id ? ' is-on' : ''}`}
            >
              {chip.label}
            </button>
          ))}
        </div>
        <p className="admin-muted">{filtered.length} listing{filtered.length === 1 ? '' : 's'}</p>
      </div>

      {filtered.length === 0 ? (
        <AdminEmpty
          emoji="📦"
          title="No matching listings"
          body={viewFilter !== 'all' || query ? 'Try clearing your search or switching the filter chip above.' : 'Approve, verify, feature, or hide marketplace listings here.'}
        />
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Listing</th>
                <th>Lister</th>
                <th>Price</th>
                <th>Visibility</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((listing) => {
                const published = listing.is_published !== false
                return (
                  <tr key={listing.id}>
                    <td>
                      <span className="admin-cell-title">{listing.emoji || '🎮'} {listing.title}</span>
                      <span className="admin-cell-sub">{listing.category} · {listing.subcategory} · {listing.location}</span>
                    </td>
                    <td>
                      {displayName(listing.profiles)}
                      <span className="admin-cell-sub">{listing.profiles?.email || ''}</span>
                    </td>
                    <td>
                      <span className="admin-cell-title">₹{listing.price_day}/day</span>
                      {(listing.price_weekend || listing.price_week) ? (
                        <span className="admin-cell-sub">
                          {listing.price_weekend ? `Wknd ₹${listing.price_weekend}` : ''}
                          {listing.price_weekend && listing.price_week ? ' · ' : ''}
                          {listing.price_week ? `Week ₹${listing.price_week}` : ''}
                        </span>
                      ) : null}
                    </td>
                    <td>
                      <div className="admin-actions">
                        <AdminBadge kind={published ? 'live' : 'hidden'}>
                          {published ? 'Shown' : 'Hidden'}
                        </AdminBadge>
                        {listing.is_featured ? <AdminBadge kind="disputed">Featured</AdminBadge> : null}
                        {listing.is_verified ? <AdminBadge kind="verified">Verified</AdminBadge> : null}
                        <AdminBadge kind={listing.is_available ? 'live' : 'hidden'}>
                          {listing.is_available ? 'In stock' : 'Off'}
                        </AdminBadge>
                      </div>
                    </td>
                    <td>
                      <div className="admin-actions">
                        <AdminAction
                          tip="Edit listing & multi-day prices"
                          ariaLabel={`Edit ${listing.title}`}
                          to={`/list-item/edit/${listing.id}`}
                        >
                          <Pencil size={14} />
                        </AdminAction>
                        <AdminAction
                          tip="Create Instagram Ad / Caption"
                          ariaLabel={`Create Instagram post for ${listing.title}`}
                          onClick={() => setIgTarget(listing)}
                        >
                          <Instagram size={14} style={{ color: '#ff2e6d' }} />
                        </AdminAction>
                        <AdminAction
                          tip="Notify host (Listing is Live)"
                          ariaLabel={`Send live alert for ${listing.title}`}
                          onClick={() => {
                            setLiveAlertTarget(listing)
                            setLiveAlertPhone(listing.contact_phone || listing.profiles?.phone || '')
                          }}
                        >
                          <Send size={14} style={{ color: '#00e5ff' }} />
                        </AdminAction>
                        <AdminAction
                          tip="View listing"
                          ariaLabel={`View ${listing.title}`}
                          to={`/listing/${listing.id}`}
                        >
                          <Eye size={14} />
                        </AdminAction>
                        <AdminAction
                          tip={published ? 'Hide from browse' : 'Show on browse'}
                          ariaLabel={published ? `Hide ${listing.title} from browse` : `Show ${listing.title} on browse`}
                          on={published}
                          onClick={() => {
                            const nextPublished = !published
                            updateListing(
                              listing,
                              { is_published: nextPublished },
                              nextPublished ? 'Listing is now live on browse!' : 'Listing hidden from browse'
                            )
                            if (nextPublished) {
                              setLiveAlertTarget(listing)
                              setLiveAlertPhone(listing.contact_phone || listing.profiles?.phone || '')
                            }
                          }}
                        >
                          {published ? <EyeOff size={14} /> : <Eye size={14} />}
                        </AdminAction>
                        <AdminAction
                          tip={listing.is_available ? 'Mark unavailable' : 'Mark available'}
                          ariaLabel={listing.is_available ? `Mark ${listing.title} unavailable` : `Mark ${listing.title} available`}
                          on={listing.is_available}
                          onClick={() => updateListing(
                            listing,
                            { is_available: !listing.is_available },
                            listing.is_available ? 'Marked unavailable' : 'Marked available'
                          )}
                        >
                          {listing.is_available ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                        </AdminAction>
                        <AdminAction
                          tip={listing.is_featured ? 'Unfeature' : 'Feature'}
                          ariaLabel={listing.is_featured ? `Unfeature ${listing.title}` : `Feature ${listing.title}`}
                          on={listing.is_featured}
                          onClick={() => updateListing(
                            listing,
                            { is_featured: !listing.is_featured },
                            listing.is_featured ? 'Removed from featured' : 'Listing featured'
                          )}
                        >
                          <Star size={14} />
                        </AdminAction>
                        <AdminAction
                          tip={listing.is_verified ? 'Remove verify' : 'Verify listing'}
                          ariaLabel={listing.is_verified ? `Unverify ${listing.title}` : `Verify ${listing.title}`}
                          on={listing.is_verified}
                          onClick={() => updateListing(
                            listing,
                            { is_verified: !listing.is_verified },
                            listing.is_verified ? 'Verification removed' : 'Listing verified'
                          )}
                        >
                          <Shield size={14} />
                        </AdminAction>
                        <AdminAction
                          tip="Delete listing"
                          ariaLabel={`Delete ${listing.title}`}
                          danger
                          onClick={() => setDeleteTarget(listing)}
                        >
                          <Trash2 size={14} />
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

      {deleteTarget ? (
        <AdminConfirm
          title="Delete listing?"
          body={`${deleteTarget.title} will be removed. Bookings tied to it may cascade.`}
          confirmLabel="Delete"
          loading={busy}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      ) : null}

      {liveAlertTarget ? (() => {
        const message = formatListingLiveMessage({ listing: liveAlertTarget, lister: liveAlertTarget.profiles })
        const clean = cleanPhoneNumber(liveAlertPhone)
        const waLink = buildWhatsAppLink(clean, message)

        const handleCopy = () => {
          navigator.clipboard.writeText(message).then(() => {
            showToast('Listing announcement copied to clipboard!', 'success')
          })
        }

        const handleSendInApp = async () => {
          setSendingLiveAlert(true)
          try {
            await sendListingLiveNotification({ listing: liveAlertTarget, lister: liveAlertTarget.profiles, customPhone: liveAlertPhone })
            showToast(`In-app live alert dispatched to ${displayName(liveAlertTarget.profiles)}!`, 'success')
          } catch (err) {
            showToast(err.message || 'Failed to dispatch in-app notification', 'error')
          } finally {
            setSendingLiveAlert(false)
          }
        }

        const handleOpenWhatsApp = () => {
          if (!clean || clean.length < 10) {
            showToast('Enter a valid 10-digit phone number first.', 'error')
            return
          }
          window.open(waLink, '_blank')
          showToast(`Opening WhatsApp chat with ${displayName(liveAlertTarget.profiles)}…`, 'success')
        }

        return (
          <div className="admin-confirm-backdrop" onClick={() => setLiveAlertTarget(null)} role="presentation">
            <div
              className="admin-confirm"
              style={{ maxWidth: '32rem', textAlign: 'left' }}
              role="dialog"
              aria-modal="true"
              onClick={(e) => e.stopPropagation()}
            >
              <AdminAction tip="Close" ariaLabel="Close dialog" onClick={() => setLiveAlertTarget(null)}>
                <X size={14} />
              </AdminAction>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
                <span style={{ fontSize: '1.4rem' }}>🚀</span>
                <h2 className="admin-confirm__title" style={{ margin: 0, textAlign: 'left' }}>
                  LISTING IS LIVE ALERT
                </h2>
              </div>

              <p className="admin-muted" style={{ fontSize: '0.82rem', marginBottom: '1rem' }}>
                Notify host <strong>{displayName(liveAlertTarget.profiles)}</strong> that their gear <strong>"{liveAlertTarget.title}"</strong> is approved & ready for bookings.
              </p>

              <div style={{ marginBottom: '1rem' }}>
                <label className="field-label" style={{ fontSize: '0.75rem', marginBottom: '0.3rem', display: 'block' }}>
                  Host WhatsApp / Phone Number
                </label>
                <input
                  type="tel"
                  className="input-dark"
                  value={liveAlertPhone}
                  onChange={(e) => setLiveAlertPhone(e.target.value)}
                  placeholder="e.g. 9876543210 (10 digits)"
                  style={{ width: '100%', fontSize: '0.9rem' }}
                />
              </div>

              <div style={{ marginBottom: '1.2rem' }}>
                <label className="field-label" style={{ fontSize: '0.75rem', marginBottom: '0.3rem', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Announcement Message Preview</span>
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
                    disabled={sendingLiveAlert}
                  >
                    <Bell size={14} /> {sendingLiveAlert ? 'Sending…' : 'Send In-App Alert'}
                  </button>
                </div>
                <button
                  type="button"
                  className="admin-filter-chip"
                  style={{ alignSelf: 'center', marginTop: '0.2rem', cursor: 'pointer' }}
                  onClick={() => setLiveAlertTarget(null)}
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )
      })() : null}

      {igTarget ? (() => {
        const postCaption = formatInstagramListingPost({ listing: igTarget, couponCode: 'WELCOME10', discountPercent: 10 })
        const storyCopy = formatInstagramStoryCopy({ listing: igTarget })
        const photoUrl = (igTarget.photos && igTarget.photos[0]) || null

        const copyText = (txt, label) => {
          navigator.clipboard.writeText(txt).then(() => {
            showToast(`${label} copied to clipboard!`, 'success')
          })
        }

        return (
          <div className="admin-confirm-backdrop" onClick={() => setIgTarget(null)} role="presentation">
            <div
              className="admin-confirm"
              style={{ maxWidth: '36rem', textAlign: 'left', maxHeight: '90vh', overflowY: 'auto' }}
              role="dialog"
              aria-modal="true"
              onClick={(e) => e.stopPropagation()}
            >
              <AdminAction tip="Close" ariaLabel="Close dialog" onClick={() => setIgTarget(null)}>
                <X size={14} />
              </AdminAction>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
                <span style={{ fontSize: '1.4rem' }}>📸</span>
                <h2 className="admin-confirm__title" style={{ margin: 0, textAlign: 'left' }}>
                  INSTAGRAM AD CREATOR
                </h2>
              </div>

              <p className="admin-muted" style={{ fontSize: '0.82rem', marginBottom: '1rem' }}>
                Ready-to-post Instagram copy, hashtags, and creative assets for <strong>"{igTarget.title}"</strong>.
              </p>

              {/* Photo & Quick Details */}
              <div style={{ display: 'flex', gap: '1rem', padding: '0.8rem', background: 'rgba(255,255,255,0.03)', borderRadius: '1rem', border: '1px solid rgba(255,255,255,0.08)', marginBottom: '1rem', alignItems: 'center' }}>
                {photoUrl ? (
                  <img
                    src={photoUrl}
                    alt={igTarget.title}
                    style={{ width: '70px', height: '70px', objectFit: 'cover', borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.1)' }}
                  />
                ) : (
                  <div style={{ width: '70px', height: '70px', background: 'rgba(255,46,109,0.15)', borderRadius: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem' }}>
                    {igTarget.emoji || '🎮'}
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {igTarget.title}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#00e5ff', marginTop: '0.2rem' }}>
                    ₹{Number(igTarget.price_day).toLocaleString('en-IN')}/day · {igTarget.location}
                  </div>
                  {photoUrl ? (
                    <a
                      href={photoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="admin-link"
                      style={{ fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '0.2rem', marginTop: '0.25rem' }}
                    >
                      <Download size={11} /> Open Photo Full-Res
                    </a>
                  ) : null}
                </div>
              </div>

              {/* Feed Post Caption Box */}
              <div style={{ marginBottom: '1.2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text)' }}>
                    Feed Post Caption (High-Converting Hook + Hashtags)
                  </span>
                  <button
                    type="button"
                    onClick={() => copyText(postCaption, 'Post Caption')}
                    style={{ background: 'none', border: 'none', color: '#ff2e6d', cursor: 'pointer', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontWeight: 700 }}
                  >
                    <Copy size={12} /> Copy Caption
                  </button>
                </div>
                <textarea
                  className="input-dark"
                  readOnly
                  rows={8}
                  value={postCaption}
                  style={{ width: '100%', fontSize: '0.78rem', lineHeight: '1.4', background: 'rgba(0,0,0,0.5)', color: 'rgba(255,255,255,0.85)', resize: 'none' }}
                />
              </div>

              {/* Story Overlay Copy */}
              <div style={{ marginBottom: '1.2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text)' }}>
                    Story Text / Sticker Copy
                  </span>
                  <button
                    type="button"
                    onClick={() => copyText(storyCopy, 'Story Copy')}
                    style={{ background: 'none', border: 'none', color: '#00e5ff', cursor: 'pointer', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontWeight: 700 }}
                  >
                    <Copy size={12} /> Copy Story Copy
                  </button>
                </div>
                <textarea
                  className="input-dark"
                  readOnly
                  rows={3}
                  value={storyCopy}
                  style={{ width: '100%', fontSize: '0.78rem', lineHeight: '1.4', background: 'rgba(0,0,0,0.5)', color: 'rgba(255,255,255,0.85)', resize: 'none' }}
                />
              </div>

              {/* CTAs */}
              <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                <a
                  href="https://www.instagram.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary"
                  style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', fontSize: '0.85rem', padding: '0.6rem 1rem', textDecoration: 'none' }}
                  onClick={() => copyText(postCaption, 'Post Caption')}
                >
                  <Instagram size={14} /> Copy & Open Instagram
                </a>
                <button
                  type="button"
                  className="btn-outline"
                  style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', fontSize: '0.85rem', padding: '0.6rem 1rem' }}
                  onClick={() => {
                    const waShare = buildWhatsAppLink('', `Check out this gear now live on LocalDen:\n\n${postCaption}`)
                    window.open(waShare, '_blank')
                  }}
                >
                  <Share2 size={14} /> Broadcast on WhatsApp
                </button>
              </div>

              <div style={{ textAlign: 'center', marginTop: '0.8rem' }}>
                <button
                  type="button"
                  className="admin-filter-chip"
                  onClick={() => setIgTarget(null)}
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )
      })() : null}
    </div>
  )
}
