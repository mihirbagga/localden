import { useCallback, useEffect, useState } from 'react'
import { Pencil, Trash2, Power } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { LIVE_CITIES } from '../../lib/liveCities'
import { useToast } from '../../contexts/ToastContext'
import { AdminAction, AdminBadge, AdminConfirm, AdminEmpty } from './AdminShared'
import { explainAdminError } from './adminHelpers'

const EMPTY_ARTIST = { name: '', type: 'dj', genres: '', city: '', bio: '', image_url: '', price_from: '', instagram_url: '', is_featured: false, is_active: true, available_dates: [] }
const EMPTY_EVENT = { title: '', category: 'music', city: '', venue: '', description: '', image_url: '', event_date: '', ticket_url: '', price_label: '', is_active: true, source: 'localden' }
const STATUSES = ['new', 'contacted', 'confirmed', 'closed']

const Field = ({ label, children }) => (
  <div><label className="field-label">{label}</label>{children}</div>
)

export default function AdminLive() {
  const { showToast } = useToast()
  const [section, setSection] = useState('artists')
  const [artists, setArtists] = useState([])
  const [events, setEvents] = useState([])
  const [requests, setRequests] = useState([])
  const [aForm, setAForm] = useState(EMPTY_ARTIST)
  const [eForm, setEForm] = useState(EMPTY_EVENT)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [del, setDel] = useState(null)

  const load = useCallback(async () => {
    const [a, e, r] = await Promise.all([
      supabase.from('live_artists').select('*').order('created_at', { ascending: false }),
      supabase.from('live_events').select('*').order('event_date', { ascending: false }).limit(200),
      supabase.from('artist_hire_requests').select('*, live_artists(name)').order('created_at', { ascending: false }),
    ])
    setArtists(a.data || []); setEvents(e.data || []); setRequests(r.data || [])
  }, [])
  useEffect(() => { load() }, [load])

  const fail = (error) => { showToast(explainAdminError(error), 'error'); return true }

  const saveArtist = async (ev) => {
    ev.preventDefault(); setSaving(true)
    const payload = {
      name: aForm.name, type: aForm.type, city: aForm.city, bio: aForm.bio,
      is_featured: aForm.is_featured, is_active: aForm.is_active,
      available_dates: [...new Set(aForm.available_dates)].sort(),
      genres: aForm.genres.split(',').map((g) => g.trim()).filter(Boolean),
      price_from: aForm.price_from ? parseInt(aForm.price_from, 10) : null,
      image_url: aForm.image_url || null, instagram_url: aForm.instagram_url || null,
    }
    const q = editing ? supabase.from('live_artists').update(payload).eq('id', editing) : supabase.from('live_artists').insert(payload)
    const { error } = await q
    setSaving(false)
    if (error && fail(error)) return
    showToast(editing ? 'Artist updated' : 'Artist posted', 'success')
    setAForm(EMPTY_ARTIST); setEditing(null); load()
  }

  const saveEvent = async (ev) => {
    ev.preventDefault(); setSaving(true)
    const payload = {
      ...eForm,
      event_date: eForm.event_date ? new Date(eForm.event_date).toISOString() : null,
      image_url: eForm.image_url || null, ticket_url: eForm.ticket_url || null, price_label: eForm.price_label || null,
      source: eForm.source || 'localden',
    }
    const q = editing ? supabase.from('live_events').update(payload).eq('id', editing) : supabase.from('live_events').insert(payload)
    const { error } = await q
    setSaving(false)
    if (error && fail(error)) return
    showToast(editing ? 'Event updated' : 'Event posted', 'success')
    setEForm(EMPTY_EVENT); setEditing(null); load()
  }

  const toggle = async (table, row) => {
    const { error } = await supabase.from(table).update({ is_active: !row.is_active }).eq('id', row.id)
    if (error && fail(error)) return
    load()
  }

  const confirmDelete = async () => {
    const { error } = await supabase.from(del.table).delete().eq('id', del.id)
    if (error && fail(error)) return
    setDel(null); showToast('Deleted', 'success'); load()
  }

  const setStatus = async (id, status) => {
    const { error } = await supabase.from('artist_hire_requests').update({ status }).eq('id', id)
    if (error && fail(error)) return
    setRequests((p) => p.map((r) => (r.id === id ? { ...r, status } : r)))
  }

  const uploadPhoto = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    let fileToUpload = file
    let uploadName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    let contentType = file.type || 'image/jpeg'

    const isHeic = file.name.toLowerCase().endsWith('.heic') ||
      file.name.toLowerCase().endsWith('.heif') ||
      file.type === 'image/heic' ||
      file.type === 'image/heif'

    if (isHeic) {
      try {
        showToast('Converting photo for universal browser compatibility…', 'info')
        const heic2any = (await import('heic2any')).default
        const converted = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.88 })
        const convertedBlob = Array.isArray(converted) ? converted[0] : converted
        uploadName = uploadName.replace(/\.hei[cf]$/i, '') + '.jpg'
        fileToUpload = new File([convertedBlob], uploadName, { type: 'image/jpeg' })
        contentType = 'image/jpeg'
      } catch (err) {
        console.warn('HEIC conversion failed, uploading original:', err)
      }
    }

    const path = `${Date.now()}-${uploadName}`
    const { error } = await supabase.storage.from('artist-photos').upload(path, fileToUpload, {
      contentType,
      upsert: true,
    })
    if (error && fail(error)) return
    const { data } = supabase.storage.from('artist-photos').getPublicUrl(path)
    setAForm((p) => ({ ...p, image_url: data.publicUrl }))
    showToast('Photo uploaded successfully', 'success')
  }

  const editArtist = (a) => { setEditing(a.id); setAForm({ ...EMPTY_ARTIST, name: a.name, type: a.type, is_featured: a.is_featured, is_active: a.is_active, available_dates: (a.available_dates || []).slice(), genres: (a.genres || []).join(', '), price_from: a.price_from ?? '', image_url: a.image_url || '', instagram_url: a.instagram_url || '', bio: a.bio || '', city: a.city || '' }) }
  const editEvent = (e) => { setEditing(e.id); setEForm({ ...EMPTY_EVENT, ...e, event_date: e.event_date ? new Date(e.event_date).toISOString().slice(0, 16) : '', venue: e.venue || '', description: e.description || '', image_url: e.image_url || '', ticket_url: e.ticket_url || '', price_label: e.price_label || '', source: e.source || 'localden' }) }

  const sa = (k) => (e) => setAForm((p) => ({ ...p, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))
  const se = (k) => (e) => setEForm((p) => ({ ...p, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

  return (
    <div>
      <datalist id="live-cities">{LIVE_CITIES.map((c) => <option key={c} value={c} />)}</datalist>
      <div className="flex gap-2 mb-4">
        {[['artists', `Artists (${artists.length})`], ['events', `Events (${events.length})`], ['requests', `Hire Requests (${requests.length})`]].map(([id, l]) => (
          <button key={id} onClick={() => { setSection(id); setEditing(null) }}
            className={section === id ? 'btn-primary text-xs py-2 px-4' : 'btn-outline text-xs py-2 px-4'}>{l}</button>
        ))}
      </div>

      {section === 'artists' && (
        <>
          <form className="admin-card" onSubmit={saveArtist}>
            <h3 className="admin-card__title">{editing ? 'EDIT ARTIST' : 'POST ARTIST FOR HIRE'}</h3>
            <div className="admin-form-grid">
              <Field label="Name"><input className="input-dark" value={aForm.name} onChange={sa('name')} required /></Field>
              <Field label="Type">
                <select className="select-dark" value={aForm.type} onChange={sa('type')}>
                  {['dj', 'singer', 'band', 'instrumentalist', 'gamer', 'other'].map((t) => <option key={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="City"><input className="input-dark" list="live-cities" value={aForm.city} onChange={sa('city')} /></Field>
              <Field label="Genres (comma separated)"><input className="input-dark" value={aForm.genres} onChange={sa('genres')} placeholder="EDM, Bollywood" /></Field>
              <Field label="Starting price (₹)"><input type="number" className="input-dark" value={aForm.price_from} onChange={sa('price_from')} /></Field>
              <Field label="Photo (upload or paste URL)">
                <input className="input-dark" value={aForm.image_url} onChange={sa('image_url')} placeholder="https://…" />
                <input type="file" accept="image/*" className="mt-1 text-xs" onChange={uploadPhoto} />
              </Field>
              <Field label="Instagram URL"><input className="input-dark" value={aForm.instagram_url} onChange={sa('instagram_url')} /></Field>
              <Field label="Bio"><input className="input-dark" value={aForm.bio} onChange={sa('bio')} /></Field>
            </div>
            <DatesEditor dates={aForm.available_dates} onChange={(d) => setAForm((p) => ({ ...p, available_dates: d }))} />
            {editing && <ReviewsPanel artistId={editing} onChange={load} />}
            <div className="flex gap-4 items-center mt-3">
              <label className="text-sm flex gap-2"><input type="checkbox" checked={aForm.is_featured} onChange={sa('is_featured')} /> Featured</label>
              <label className="text-sm flex gap-2"><input type="checkbox" checked={aForm.is_active} onChange={sa('is_active')} /> Active</label>
              <button className="btn-primary text-sm py-2 px-5 ml-auto" disabled={saving}>{editing ? 'Update' : 'Post Artist'}</button>
              {editing && <button type="button" className="btn-outline text-sm py-2 px-4" onClick={() => { setEditing(null); setAForm(EMPTY_ARTIST) }}>Cancel</button>}
            </div>
          </form>
          <Rows empty="No artists yet" items={artists} title={(a) => a.name}
            sub={(a) => `${a.type} · ${a.city || '—'} · ${a.price_from ? '₹' + a.price_from : 'on request'} · ★ ${a.rating || 0} (${a.review_count || 0}) · ${(a.available_dates || []).length} dates`}
            badge={(a) => (a.is_active ? 'Active' : 'Hidden')}
            onEdit={editArtist} onToggle={(a) => toggle('live_artists', a)} onDelete={(a) => setDel({ table: 'live_artists', id: a.id })} />
        </>
      )}

      {section === 'events' && (
        <>
          <form className="admin-card" onSubmit={saveEvent}>
            <h3 className="admin-card__title">{editing ? 'EDIT EVENT' : 'POST EVENT'}</h3>
            <p className="text-xs opacity-60 mb-2">AI agent adds events automatically: <code>node scripts/events_agent.cjs "Mumbai"</code></p>
            <div className="admin-form-grid">
              <Field label="Title"><input className="input-dark" value={eForm.title} onChange={se('title')} required /></Field>
              <Field label="Category">
                <select className="select-dark" value={eForm.category} onChange={se('category')}>
                  {['music', 'dj', 'gaming', 'other'].map((t) => <option key={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="City"><input className="input-dark" list="live-cities" value={eForm.city} onChange={se('city')} required /></Field>
              <Field label="Platform / Organizer">
                <select className="select-dark" value={eForm.source} onChange={se('source')}>
                  <option value="localden">⭐ LocalDen Event (Featured / First)</option>
                  <option value="manual">Manual / Partner Event</option>
                  <option value="district">District</option>
                  <option value="bookmyshow">BookMyShow</option>
                  <option value="external">Other Platform</option>
                </select>
              </Field>
              <Field label="Venue"><input className="input-dark" value={eForm.venue} onChange={se('venue')} /></Field>
              <Field label="Date & time"><input type="datetime-local" className="input-dark" value={eForm.event_date} onChange={se('event_date')} required /></Field>
              <Field label="Price label"><input className="input-dark" value={eForm.price_label} onChange={se('price_label')} placeholder="₹499 onwards" /></Field>
              <Field label="Ticket URL"><input className="input-dark" value={eForm.ticket_url} onChange={se('ticket_url')} /></Field>
              <Field label="Image URL"><input className="input-dark" value={eForm.image_url} onChange={se('image_url')} /></Field>
              <Field label="Description"><input className="input-dark" value={eForm.description} onChange={se('description')} /></Field>
            </div>
            <div className="flex gap-4 items-center mt-3">
              <label className="text-sm flex gap-2"><input type="checkbox" checked={eForm.is_active} onChange={se('is_active')} /> Active</label>
              <button className="btn-primary text-sm py-2 px-5 ml-auto" disabled={saving}>{editing ? 'Update' : 'Post Event'}</button>
              {editing && <button type="button" className="btn-outline text-sm py-2 px-4" onClick={() => { setEditing(null); setEForm(EMPTY_EVENT) }}>Cancel</button>}
            </div>
          </form>
          <Rows empty="No events yet" items={events} title={(e) => e.title}
            sub={(e) => {
              const isPast = e.event_date && new Date(e.event_date).getTime() < Date.now()
              return `${e.category} · ${e.city} · ${e.event_date ? new Date(e.event_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'TBA'} · ${e.source}${isPast ? ' · ⚠️ Date passed' : ''}`
            }}
            badge={(e) => {
              if (!e.is_active) return 'Hidden'
              if (e.event_date && new Date(e.event_date).getTime() < Date.now()) return 'Ended'
              return 'Active'
            }}
            onEdit={editEvent} onToggle={(e) => toggle('live_events', e)} onDelete={(e) => setDel({ table: 'live_events', id: e.id })} />
        </>
      )}

      {section === 'requests' && (
        requests.length === 0 ? <AdminEmpty emoji="📨" title="No hire requests" body="Requests from the Live page show up here." /> : (
          <div className="grid gap-3">
            {requests.map((r) => (
              <div key={r.id} className="admin-card">
                <div className="flex flex-wrap justify-between gap-2">
                  <b>{r.live_artists?.name || 'Artist'} <span className="opacity-60 font-normal">← {r.name}</span></b>
                  <select className="select-dark w-auto" value={r.status} onChange={(e) => setStatus(r.id, e.target.value)}>
                    {STATUSES.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <p className="text-sm opacity-80 mt-1">
                  <a href={`tel:${r.phone}`} className="text-[var(--cyan)]">{r.phone}</a> · {r.event_type || 'event'} · {r.event_date || 'date TBD'} · {r.city || '—'} · {r.budget ? '₹' + r.budget : 'no budget'}
                </p>
                {r.message && <p className="text-xs opacity-60 mt-1">{r.message}</p>}
              </div>
            ))}
          </div>
        )
      )}

      {del && <AdminConfirm title="Delete?" body="This cannot be undone." confirmLabel="Delete" onConfirm={confirmDelete} onCancel={() => setDel(null)} />}
    </div>
  )
}

function Rows({ items, title, sub, badge, onEdit, onToggle, onDelete, empty }) {
  if (!items.length) return <AdminEmpty emoji="🎶" title={empty} body="Use the form above." />
  return (
    <div className="grid gap-2 mt-4">
      {items.map((it) => (
        <div key={it.id} className="admin-card flex items-center justify-between gap-3">
          <div className="min-w-0">
            <b className="block truncate">{title(it)}</b>
            <span className="text-xs opacity-60">{sub(it)}</span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <AdminBadge kind={it.is_active ? 'success' : 'muted'}>{badge(it)}</AdminBadge>
            <AdminAction tip="Edit" ariaLabel="Edit" onClick={() => onEdit(it)}><Pencil size={14} /></AdminAction>
            <AdminAction tip="Show/hide" ariaLabel="Toggle" onClick={() => onToggle(it)}><Power size={14} /></AdminAction>
            <AdminAction tip="Delete" ariaLabel="Delete" danger onClick={() => onDelete(it)}><Trash2 size={14} /></AdminAction>
          </div>
        </div>
      ))}
    </div>
  )
}


const iso = (d) => d.toISOString().slice(0, 10)

function DatesEditor({ dates, onChange }) {
  const [one, setOne] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const addOne = () => { if (one) { onChange([...new Set([...dates, one])].sort()); setOne('') } }
  const addRange = () => {
    if (!from || !to || to < from) return
    const out = []
    for (let d = new Date(from); iso(d) <= to && out.length < 366; d.setDate(d.getDate() + 1)) out.push(iso(d))
    onChange([...new Set([...dates, ...out])].sort()); setFrom(''); setTo('')
  }
  return (
    <div className="mt-4">
      <label className="field-label">Available dates ({dates.length})</label>
      <div className="flex flex-wrap gap-2 items-center mb-2">
        <input type="date" className="input-dark w-auto" value={one} onChange={(e) => setOne(e.target.value)} />
        <button type="button" className="btn-outline text-xs py-2 px-3" onClick={addOne}>Add date</button>
        <span className="opacity-50 text-xs">or range</span>
        <input type="date" className="input-dark w-auto" value={from} onChange={(e) => setFrom(e.target.value)} />
        <input type="date" className="input-dark w-auto" value={to} onChange={(e) => setTo(e.target.value)} />
        <button type="button" className="btn-outline text-xs py-2 px-3" onClick={addRange}>Add range</button>
        {dates.length > 0 && <button type="button" className="text-xs underline opacity-70" onClick={() => onChange([])}>Clear all</button>}
      </div>
      <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
        {dates.map((d) => (
          <span key={d} className="text-xs px-2 py-1 rounded-full bg-white/10 inline-flex gap-1.5">
            {d}<button type="button" aria-label={`Remove ${d}`} onClick={() => onChange(dates.filter((x) => x !== d))}>×</button>
          </span>
        ))}
      </div>
    </div>
  )
}

function ReviewsPanel({ artistId, onChange }) {
  const { showToast } = useToast()
  const [list, setList] = useState([])
  const [f, setF] = useState({ reviewer_name: '', rating: 5, comment: '' })
  const load = useCallback(async () => {
    const { data } = await supabase.from('artist_reviews').select('*').eq('artist_id', artistId).order('created_at', { ascending: false })
    setList(data || [])
  }, [artistId])
  useEffect(() => { load() }, [load])
  const add = async () => {
    if (!f.reviewer_name.trim()) return showToast('Reviewer name required', 'error')
    const { error } = await supabase.from('artist_reviews').insert({ artist_id: artistId, reviewer_name: f.reviewer_name.trim(), rating: Number(f.rating), comment: f.comment || null })
    if (error) return showToast(explainAdminError(error), 'error')
    setF({ reviewer_name: '', rating: 5, comment: '' }); load(); onChange()
  }
  const remove = async (id) => {
    await supabase.from('artist_reviews').delete().eq('id', id)
    load(); onChange()
  }
  return (
    <div className="mt-4">
      <label className="field-label">Reviews & rating (rating is the average of reviews)</label>
      <div className="flex flex-wrap gap-2 mb-2">
        <input className="input-dark w-40" placeholder="Reviewer" value={f.reviewer_name} onChange={(e) => setF({ ...f, reviewer_name: e.target.value })} />
        <select className="select-dark w-auto" value={f.rating} onChange={(e) => setF({ ...f, rating: e.target.value })}>
          {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} ★</option>)}
        </select>
        <input className="input-dark flex-1 min-w-[180px]" placeholder="Comment" value={f.comment} onChange={(e) => setF({ ...f, comment: e.target.value })} />
        <button type="button" className="btn-outline text-xs py-2 px-3" onClick={add}>Add review</button>
      </div>
      {list.map((r) => (
        <div key={r.id} className="text-xs flex justify-between gap-2 py-1 border-b border-white/10">
          <span><b>{r.reviewer_name}</b> {'★'.repeat(r.rating)} {r.comment}</span>
          <button type="button" className="text-red-400" onClick={() => remove(r.id)}>Delete</button>
        </div>
      ))}
    </div>
  )
}
