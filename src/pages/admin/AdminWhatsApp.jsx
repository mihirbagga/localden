import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  MessageSquare, Smartphone, Check, Send, AlertCircle, Shield, RefreshCw, Save,
  CheckCheck, Clock, XCircle, MinusCircle, RotateCcw, Zap, CalendarClock, Copy,
} from 'lucide-react'
import { useToast } from '../../contexts/ToastContext'
import {
  useWhatsAppSettings,
  cleanPhoneNumber,
  sendWhatsAppNotification,
  WA_EVENTS,
  isEventEnabled,
  fetchOutbox,
  runDispatch,
} from '../../lib/whatsappSmsService'
import { SUPPORT_PHONE_TEL } from '../../lib/contact'
import { explainAdminError, formatDate } from './adminHelpers'

const STATUS_STYLE = {
  queued: { label: 'Queued', icon: Clock, cls: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
  sending: { label: 'Sending', icon: RefreshCw, cls: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30' },
  sent: { label: 'Sent', icon: CheckCheck, cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
  failed: { label: 'Failed', icon: XCircle, cls: 'bg-red-500/15 text-red-300 border-red-500/30' },
  skipped: { label: 'Skipped', icon: MinusCircle, cls: 'bg-white/10 text-white/60 border-white/15' },
}

const EVENT_LABEL = Object.fromEntries(WA_EVENTS.map((e) => [e.id, e.label]))

const SETUP_SQL = `-- After deploying the function, in the SQL editor:
select vault.create_secret('https://<project-ref>.supabase.co', 'project_url');
select vault.create_secret('<WA_DISPATCH_SECRET>', 'wa_dispatch_secret');`

const SETUP_CLI = `supabase functions deploy whatsapp-dispatch --no-verify-jwt
supabase secrets set WHATSAPP_WEBHOOK_URL=<your webhook> \\
  WA_DISPATCH_SECRET=<long random string> SITE_URL=https://localden.online`

function Toggle({ checked, onChange, label }) {
  return (
    <label className="relative inline-flex items-center cursor-pointer shrink-0">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="sr-only peer" aria-label={label} />
      <span className="w-10 h-[22px] bg-white/10 rounded-full peer-checked:bg-emerald-500 transition-colors" />
      <span className="absolute left-[3px] top-[3px] w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-[18px]" />
    </label>
  )
}

function CheckRow({ ok, warn, title, detail }) {
  const Icon = ok ? Check : warn ? AlertCircle : XCircle
  const tone = ok ? 'text-emerald-400' : warn ? 'text-amber-400' : 'text-red-400'
  return (
    <div className="flex items-start gap-2.5 py-2 border-b border-white/5 last:border-0">
      <Icon size={15} className={`${tone} mt-0.5 shrink-0`} />
      <div className="min-w-0">
        <span className="text-xs font-semibold text-white block">{title}</span>
        <span className="text-[11px] text-white/55">{detail}</span>
      </div>
    </div>
  )
}

export default function AdminWhatsApp() {
  const { showToast } = useToast()
  const { settings, save, loading } = useWhatsAppSettings()

  const [enabled, setEnabled] = useState(true)
  const [adminPhone, setAdminPhone] = useState('')
  const [events, setEvents] = useState({})
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [busy, setBusy] = useState('')

  const [server, setServer] = useState(null) // { webhook, cronSecret } | { error }
  const [outbox, setOutbox] = useState([])
  const [outboxError, setOutboxError] = useState('')
  const [filter, setFilter] = useState('all')
  const [preview, setPreview] = useState(null)

  useEffect(() => {
    if (loading || !settings) return
    setEnabled(settings.enabled !== false)
    setAdminPhone(settings.admin_phone || SUPPORT_PHONE_TEL.replace(/\D/g, ''))
    setEvents(Object.fromEntries(WA_EVENTS.map((e) => [e.id, isEventEnabled(settings, e.id)])))
  }, [settings, loading])

  const loadOutbox = useCallback(async () => {
    try {
      setOutbox(await fetchOutbox({ limit: 60, status: filter }))
      setOutboxError('')
    } catch (err) {
      setOutboxError(/whatsapp_outbox/.test(err.message || '') ? 'Run supabase/whatsapp_automation_migration.sql first.' : explainAdminError(err))
    }
  }, [filter])

  useEffect(() => { loadOutbox() }, [loadOutbox])

  useEffect(() => {
    runDispatch('status').then(setServer).catch((err) => setServer({ error: err.message }))
  }, [])

  const counts = useMemo(() => {
    const c = { queued: 0, sent: 0, failed: 0, skipped: 0 }
    outbox.forEach((row) => { if (c[row.status] !== undefined) c[row.status] += 1 })
    return c
  }, [outbox])

  const legacyPublicUrl = Boolean(settings?.webhook_url)
  const groups = useMemo(() => [...new Set(WA_EVENTS.map((e) => e.group))], [])

  const handleSave = async () => {
    const cleaned = cleanPhoneNumber(adminPhone)
    if (!cleaned || cleaned.length < 10) {
      showToast('Please enter a valid admin phone number (at least 10 digits).', 'error')
      return
    }
    setSaving(true)
    try {
      await save({
        enabled,
        admin_phone: cleaned,
        events,
        // The webhook is a server secret now; drop the public copy once the secret works
        webhook_url: server?.webhook === 'secret' ? '' : (settings?.webhook_url || ''),
      })
      showToast(server?.webhook === 'secret' && legacyPublicUrl
        ? 'Saved. Public webhook URL removed — the server secret is used now.'
        : 'WhatsApp automation settings saved!', 'success')
    } catch (err) {
      showToast(explainAdminError(err), 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleTest = async () => {
    const cleaned = cleanPhoneNumber(adminPhone)
    if (!cleaned) {
      showToast('Set an admin phone number first.', 'error')
      return
    }
    setTesting(true)
    const res = await sendWhatsAppNotification({
      phone: cleaned,
      message: `🔔 *LocalDen test message* ⚡\n\nAutomatic WhatsApp messages are working.\n🕒 ${new Date().toLocaleString('en-IN')}`,
      event: 'test_alert',
    })
    setTesting(false)
    loadOutbox()
    if (res.webhookSuccess) {
      showToast('Test sent through the server webhook ✓', 'success')
    } else {
      showToast(`Server send failed: ${res.webhookError || 'unknown error'}. Opening WhatsApp instead.`, 'error')
      window.open(res.waUrl, '_blank', 'noopener,noreferrer')
    }
  }

  const act = async (action, extra = {}, okMsg = '') => {
    setBusy(action + (extra.id || ''))
    try {
      const res = await runDispatch(action, extra)
      showToast(okMsg || `Sent ${res.sent || 0} · retrying ${res.retrying || 0} · skipped ${res.skipped || 0}`, 'success')
      loadOutbox()
    } catch (err) {
      showToast(err.message || 'Dispatch failed', 'error')
    } finally {
      setBusy('')
    }
  }

  const copy = (text) => navigator.clipboard?.writeText(text).then(() => showToast('Copied', 'success'))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-950/60 via-green-900/30 to-black p-5 rounded-2xl border border-emerald-500/30">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <MessageSquare size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white">WhatsApp Automation</h2>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${enabled ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-white/10 text-white/50 border-white/20'}`}>
                  {enabled ? 'Active' : 'Paused'}
                </span>
              </div>
              <p className="text-white/60 text-xs mt-1">
                Renters, hosts and admins get WhatsApp messages automatically at every booking step — sent from the server, no tab needs to be open.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={handleTest} disabled={testing}
              className="px-3.5 py-2 rounded-xl bg-emerald-500 text-black font-bold text-xs hover:bg-emerald-400 flex items-center gap-1.5 disabled:opacity-60">
              {testing ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />} Send test
            </button>
            <button type="button" onClick={handleSave} disabled={saving}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/20 flex items-center gap-1.5 disabled:opacity-60">
              <Save size={14} /> {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 space-y-5">
          {/* Setup checklist */}
          <div className="glass p-5 rounded-2xl border border-white/10">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-2">
              <Shield size={16} className="text-cyan-400" /> Server setup
            </h3>
            <CheckRow
              ok={!outboxError}
              title="Database triggers & outbox"
              detail={outboxError || 'whatsapp_automation_migration.sql is installed.'}
            />
            <CheckRow
              ok={server?.webhook === 'secret'}
              warn={server?.webhook === 'legacy_public_setting'}
              title="Webhook URL (server secret)"
              detail={
                server?.error ? `Function not reachable: ${server.error}`
                  : server?.webhook === 'secret' ? 'WHATSAPP_WEBHOOK_URL is set.'
                    : server?.webhook === 'legacy_public_setting' ? 'Using the old public URL. Set the secret, then Save to remove it.'
                      : 'Not set — messages queue up but cannot be sent.'
              }
            />
            <CheckRow
              ok={Boolean(server?.cronSecret)}
              title="Every-minute dispatcher"
              detail={server?.cronSecret ? 'WA_DISPATCH_SECRET is set (also add it to Vault).' : 'Set WA_DISPATCH_SECRET and the two Vault secrets so pg_cron can send.'}
            />
            {(server?.webhook !== 'secret' || !server?.cronSecret) && (
              <div className="mt-3 space-y-2">
                {[SETUP_CLI, SETUP_SQL].map((code) => (
                  <div key={code} className="relative">
                    <pre className="text-[10.5px] leading-relaxed text-cyan-200 bg-black/50 border border-white/10 rounded-xl p-3 pr-9 overflow-x-auto whitespace-pre">{code}</pre>
                    <button type="button" onClick={() => copy(code)} className="absolute top-2 right-2 p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10" aria-label="Copy">
                      <Copy size={12} />
                    </button>
                  </div>
                ))}
                <p className="text-[11px] text-white/50">
                  The webhook receives <code className="text-cyan-300">{'{ event, recipient_phone, message, data }'}</code> — same as before, so your Make/Zapier scenario keeps working.
                </p>
              </div>
            )}
          </div>

          {/* Master switch + admin phone */}
          <div className="glass p-5 rounded-2xl border border-white/10 space-y-4">
            <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/5">
              <div>
                <span className="text-xs font-semibold text-white block">Send automatic messages</span>
                <span className="text-[11px] text-white/50">Paused = nothing new is queued or sent</span>
              </div>
              <Toggle checked={enabled} onChange={setEnabled} label="Send automatic messages" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-white/90 mb-1.5" htmlFor="wa-admin-phone">Admin WhatsApp number</label>
              <div className="relative">
                <Smartphone size={16} className="absolute left-3 top-3 text-white/40" />
                <input
                  id="wa-admin-phone"
                  type="tel"
                  value={adminPhone}
                  onChange={(e) => setAdminPhone(e.target.value)}
                  placeholder="919034695091"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-black/50 border border-white/15 text-white text-sm font-mono focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <p className="text-[11px] text-white/50 mt-1">Receives new-order and KYC alerts. Include the country code.</p>
            </div>
          </div>

          {/* Event switches */}
          <div className="glass p-5 rounded-2xl border border-white/10 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Zap size={16} className="text-emerald-400" /> Messages
            </h3>
            {groups.map((group) => (
              <div key={group}>
                <span className="text-[10px] font-bold uppercase tracking-wider text-white/40 block mb-1.5">{group}</span>
                <div className="space-y-1">
                  {WA_EVENTS.filter((e) => e.group === group).map((e) => (
                    <div key={e.id} className="flex items-center justify-between gap-3 py-1.5">
                      <div className="min-w-0">
                        <span className="text-xs text-white">{e.label}</span>
                        <span className="text-[10px] text-white/45 ml-2">→ {e.to}</span>
                      </div>
                      <Toggle
                        checked={events[e.id] !== false}
                        onChange={(v) => setEvents((prev) => ({ ...prev, [e.id]: v }))}
                        label={e.label}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <p className="text-[11px] text-white/45">Reminders run daily at 9:00 AM IST. Remember to save.</p>
          </div>
        </div>

        {/* Delivery log */}
        <div className="lg:col-span-7 space-y-5">
          <div className="glass p-5 rounded-2xl border border-white/10 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <CheckCheck size={16} className="text-emerald-400" /> Delivery log
              </h3>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => act('process')} disabled={Boolean(busy)}
                  className="px-3 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold flex items-center gap-1 disabled:opacity-50">
                  <Send size={12} /> Send queued now
                </button>
                <button type="button" onClick={() => act('reminders')} disabled={Boolean(busy)}
                  className="px-3 py-1.5 rounded-lg bg-white/5 text-white/80 border border-white/15 text-[11px] font-bold flex items-center gap-1 disabled:opacity-50">
                  <CalendarClock size={12} /> Run reminders now
                </button>
                <button type="button" onClick={loadOutbox} className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10" aria-label="Refresh log">
                  <RefreshCw size={13} />
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {['all', 'queued', 'sent', 'failed', 'skipped'].map((s) => (
                <button key={s} type="button" onClick={() => setFilter(s)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border capitalize ${filter === s ? 'bg-emerald-500/20 text-emerald-200 border-emerald-500/40' : 'text-white/60 border-white/10 hover:text-white'}`}>
                  {s}{s !== 'all' && filter === 'all' ? ` · ${counts[s]}` : ''}
                </button>
              ))}
            </div>

            {outboxError ? (
              <p className="text-xs text-amber-300 py-6 text-center">{outboxError}</p>
            ) : outbox.length === 0 ? (
              <p className="text-xs text-white/40 py-8 text-center">No messages yet. They appear here as bookings move through each step.</p>
            ) : (
              <div className="divide-y divide-white/5 max-h-[34rem] overflow-y-auto pr-1">
                {outbox.map((row) => {
                  const st = STATUS_STYLE[row.status] || STATUS_STYLE.skipped
                  const Icon = st.icon
                  return (
                    <div key={row.id} className={`py-2.5 flex items-start gap-3 cursor-pointer rounded-lg px-2 -mx-2 hover:bg-white/[0.03] ${preview?.id === row.id ? 'bg-white/[0.05]' : ''}`}
                      onClick={() => setPreview(row)} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && setPreview(row)}>
                      <span className={`mt-0.5 px-1.5 py-0.5 rounded border text-[10px] font-bold flex items-center gap-1 shrink-0 ${st.cls}`}>
                        <Icon size={10} /> {st.label}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2">
                          <span className="text-xs font-semibold text-white">{EVENT_LABEL[row.event] || row.event}</span>
                          <span className="text-[10px] text-white/45 capitalize">→ {row.recipient_role}</span>
                          {row.phone ? <span className="text-[10px] font-mono text-white/45">+{row.phone}</span> : null}
                        </div>
                        {row.last_error ? <p className="text-[10.5px] text-red-300/80 truncate">{row.last_error}</p> : null}
                        {row.message ? <p className="text-[10.5px] text-white/50 truncate">{row.message.replace(/\s+/g, ' ')}</p> : null}
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className="text-[10px] text-white/40">{formatDate(row.sent_at || row.created_at)}</span>
                        {['failed', 'skipped'].includes(row.status) ? (
                          <button type="button" disabled={Boolean(busy)}
                            onClick={(e) => { e.stopPropagation(); act('retry', { id: row.id }, 'Retried') }}
                            className="text-[10px] font-bold text-emerald-300 hover:text-emerald-200 flex items-center gap-0.5 disabled:opacity-50">
                            <RotateCcw size={10} /> Retry
                          </button>
                        ) : null}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Preview of the selected message */}
          <div className="glass p-5 rounded-2xl border border-white/10 space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <MessageSquare size={16} className="text-emerald-400" /> Message preview
            </h3>
            <div className="bg-[#0b141a] p-3 rounded-2xl border border-emerald-900/40">
              <div className="flex items-center gap-2 pb-2.5 mb-2.5 border-b border-white/10">
                <div className="w-7 h-7 rounded-full bg-emerald-600 flex items-center justify-center text-white text-xs font-bold">LD</div>
                <div>
                  <span className="text-xs font-bold text-white block">{preview?.phone ? `+${preview.phone}` : 'LocalDen'}</span>
                  <span className="text-[10px] text-emerald-400">{preview ? EVENT_LABEL[preview.event] || preview.event : 'Select a message in the log'}</span>
                </div>
              </div>
              <div className="bg-[#005c4b] text-white p-3 rounded-xl rounded-tl-none text-[11.5px] leading-relaxed whitespace-pre-wrap max-w-[92%]">
                {preview?.message || 'Messages are written when they are sent, so queued items show their text once dispatched.'}
                {preview?.status === 'sent' ? (
                  <div className="flex items-center justify-end gap-1 text-[9px] text-white/60 pt-1">
                    {formatDate(preview.sent_at)} <CheckCheck size={12} className="text-cyan-400" />
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
