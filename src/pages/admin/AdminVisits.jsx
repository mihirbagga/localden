import { useState, useEffect, useMemo } from 'react'
import {
  Users, Activity, Globe, Compass, TrendingUp, RefreshCw,
  Copy, Check, ExternalLink, Link2, AlertTriangle, Instagram,
  MessageCircle, Twitter, Youtube, Search, Share2, Tag
} from 'lucide-react'
import { fetchVisitAnalytics } from '../../lib/visitTracker'
import { AdminStat, AdminSearch } from './AdminShared'
import { formatDate } from './adminHelpers'

const SQL_MIGRATION_TEXT = `-- Run in Supabase SQL Editor:
create table if not exists public.site_visits (
  id uuid primary key default gen_random_uuid(),
  visitor_id text not null,
  source text not null default 'direct',
  landing_path text default '/',
  referrer text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists idx_site_visits_visitor_id on public.site_visits (visitor_id);
create index if not exists idx_site_visits_source on public.site_visits (source);
create index if not exists idx_site_visits_created_at on public.site_visits (created_at desc);

alter table public.site_visits enable row level security;

create policy "Allow public visit insert"
  on public.site_visits for insert with check (true);

create policy "Allow visit read"
  on public.site_visits for select using (true);`

function getSourceIcon(src) {
  const s = (src || '').toLowerCase()
  if (s.includes('instagram')) return <Instagram size={14} className="text-pink-400" />
  if (s.includes('whatsapp') || s.includes('wa')) return <MessageCircle size={14} className="text-emerald-400" />
  if (s.includes('twitter') || s.includes('x')) return <Twitter size={14} className="text-cyan-400" />
  if (s.includes('youtube')) return <Youtube size={14} className="text-red-400" />
  if (s.includes('google')) return <Search size={14} className="text-blue-400" />
  if (s.includes('direct')) return <Globe size={14} className="text-purple-400" />
  return <Tag size={14} className="text-amber-400" />
}

export default function AdminVisits() {
  const [data, setData] = useState({
    tableExists: true,
    totalUnique: 0,
    totalVisits: 0,
    sources: [],
    recentVisits: [],
  })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [copiedKey, setCopiedKey] = useState('')
  const [customParam, setCustomParam] = useState('')

  const loadData = async () => {
    setLoading(true)
    try {
      const res = await fetchVisitAnalytics()
      setData(res)
    } catch {
      // fallback handled in fetchVisitAnalytics
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const copyToClipboard = (text, key) => {
    try {
      navigator.clipboard.writeText(text)
      setCopiedKey(key)
      setTimeout(() => setCopiedKey(''), 2200)
    } catch {
      // ignore
    }
  }

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://localden.online'

  const filteredSources = useMemo(() => {
    if (!search.trim()) return data.sources
    const q = search.toLowerCase().trim()
    return data.sources.filter((s) => s.source.toLowerCase().includes(q))
  }, [data.sources, search])

  const topSource = data.sources[0]
  const topSourcePercent = topSource && data.totalUnique > 0
    ? Math.round((topSource.unique_count / data.totalUnique) * 100)
    : 0

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bungee text-white">Site Visits & Source Analytics</h2>
          <p className="admin-muted text-xs">
            Unique visitor tracking with URL campaign source attribution (<code className="text-pink-400">?source=...</code>).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="btn-outline text-xs flex items-center gap-1.5 py-1.5 px-3"
            aria-label="Refresh visit stats"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            <span>{loading ? 'Refreshing…' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* ── Table Not Created Warning ──────────────────── */}
      {!data.tableExists && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs space-y-3">
          <div className="flex items-center gap-2 font-bold text-sm text-amber-300">
            <AlertTriangle size={18} />
            <span>Database Table Needed: site_visits</span>
          </div>
          <p className="leading-relaxed">
            The <code className="bg-black/40 px-1 py-0.5 rounded text-amber-200 font-mono">site_visits</code> table is not yet created in your Supabase project. To start recording live site traffic and URL sources, run the migration below in your Supabase SQL Editor.
          </p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => copyToClipboard(SQL_MIGRATION_TEXT, 'migration-sql')}
              className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-100 font-semibold flex items-center gap-1.5 transition-all text-xs"
            >
              {copiedKey === 'migration-sql' ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              <span>{copiedKey === 'migration-sql' ? 'SQL Copied!' : 'Copy SQL Migration'}</span>
            </button>
            <span className="text-amber-400/60 text-[11px]">
              File located at <code className="font-mono">supabase/site_visits_migration.sql</code>
            </span>
          </div>
        </div>
      )}

      {/* ── Top Stats Row ──────────────────────────────── */}
      <div className="admin-stats">
        <AdminStat
          icon={<Users size={16} />}
          label="Unique visitors"
          value={data.totalUnique.toLocaleString()}
          sub="Distinct devices / browsers"
          tone="magenta"
        />
        <AdminStat
          icon={<Activity size={16} />}
          label="Total page visits"
          value={data.totalVisits.toLocaleString()}
          sub="All logged visit sessions"
          tone="cyan"
        />
        <AdminStat
          icon={<Compass size={16} />}
          label="Campaign sources"
          value={data.sources.length}
          sub="Distinct channels tracked"
          tone="gold"
        />
        <AdminStat
          icon={<TrendingUp size={16} />}
          label="Top source"
          value={topSource ? topSource.source : 'None yet'}
          sub={topSource ? `${topSourcePercent}% of unique traffic` : 'Awaiting visits'}
          tone="green"
        />
      </div>

      {/* ── Quick URL Generator / Share Helper ─────────── */}
      <div className="admin-card space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Share2 size={16} className="text-pink-400" />
            <h3 className="admin-card__title">CAMPAIGN TRACKING LINK BUILDER</h3>
          </div>
          <span className="text-[11px] text-white/40">URL parameter: ?source=YOUR_SOURCE</span>
        </div>

        <p className="text-xs text-white/60">
          Share these custom URLs across your social media bio, WhatsApp groups, posters, or reels. Any visitor landing on these links will be tracked under that source name.
        </p>

        {/* Preset Chips */}
        <div>
          <span className="text-[10px] uppercase font-mono tracking-wider text-white/40 block mb-2">
            1-Click Pre-Built Campaign Links:
          </span>
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'instagram', label: 'Instagram Bio / Reel', icon: Instagram, color: 'hover:border-pink-500/50 hover:bg-pink-500/10 text-pink-300' },
              { id: 'whatsapp', label: 'WhatsApp Groups', icon: MessageCircle, color: 'hover:border-emerald-500/50 hover:bg-emerald-500/10 text-emerald-300' },
              { id: 'twitter', label: 'Twitter / X', icon: Twitter, color: 'hover:border-cyan-500/50 hover:bg-cyan-500/10 text-cyan-300' },
              { id: 'youtube', label: 'YouTube Description', icon: Youtube, color: 'hover:border-red-500/50 hover:bg-red-500/10 text-red-300' },
              { id: 'reddit', label: 'Reddit', icon: Tag, color: 'hover:border-orange-500/50 hover:bg-orange-500/10 text-orange-300' },
              { id: 'poster-qr', label: 'Offline Posters / QR', icon: Tag, color: 'hover:border-purple-500/50 hover:bg-purple-500/10 text-purple-300' },
            ].map(({ id, label, icon: Icon, color }) => {
              const url = `${baseUrl}/?source=${id}`
              const isCopied = copiedKey === `preset-${id}`
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => copyToClipboard(url, `preset-${id}`)}
                  className={`text-xs px-2.5 py-1.5 rounded-lg border border-white/10 bg-white/5 flex items-center gap-1.5 transition-all ${color}`}
                  title={`Copy: ${url}`}
                >
                  <Icon size={12} />
                  <span>{label}</span>
                  {isCopied ? (
                    <Check size={11} className="text-emerald-400 ml-1" />
                  ) : (
                    <Copy size={11} className="text-white/40 ml-1" />
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Custom Source Input */}
        <div className="pt-2 border-t border-white/5 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="flex-1 relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 text-xs font-mono">
              {baseUrl}/?source=
            </span>
            <input
              type="text"
              className="input-dark text-xs py-2 pl-[185px] sm:pl-[195px] pr-3 font-mono"
              placeholder="fest-banner-2025"
              value={customParam}
              onChange={(e) => setCustomParam(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
            />
          </div>
          <button
            type="button"
            disabled={!customParam.trim()}
            onClick={() => copyToClipboard(`${baseUrl}/?source=${customParam.trim()}`, 'custom-url')}
            className="btn-primary text-xs py-2 px-4 flex items-center justify-center gap-1.5 flex-shrink-0 disabled:opacity-40"
          >
            {copiedKey === 'custom-url' ? <Check size={13} /> : <Copy size={13} />}
            <span>{copiedKey === 'custom-url' ? 'Link Copied!' : 'Copy Custom Link'}</span>
          </button>
          {customParam.trim() && (
            <a
              href={`${baseUrl}/?source=${customParam.trim()}`}
              target="_blank"
              rel="noreferrer"
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white flex items-center justify-center transition-colors"
              title="Test link in new tab"
            >
              <ExternalLink size={14} />
            </a>
          )}
        </div>
      </div>

      {/* ── Source-Wise Breakdown Table ────────────────── */}
      <div className="admin-card space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="admin-card__title">SOURCE-WISE VISITS BREAKDOWN</h3>
            <p className="admin-muted text-xs">
              Showing traffic count grouped by URL source parameter and referral origin.
            </p>
          </div>
          <div className="w-full sm:w-64">
            <AdminSearch
              value={search}
              onChange={setSearch}
              placeholder="Search source…"
              ariaLabel="Search sources"
            />
          </div>
        </div>

        {filteredSources.length === 0 ? (
          <div className="p-8 text-center rounded-xl bg-white/[0.02] border border-white/5 text-white/50 text-xs space-y-2">
            <p className="text-base">📊 No visit sources recorded yet.</p>
            <p>
              When visitors access the site via a link with <code className="text-pink-400 font-mono">?source=instagram</code> or other tags, their visits will appear here with unique counts.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="admin-table text-xs">
              <thead>
                <tr>
                  <th className="text-left py-2.5 px-3">SOURCE</th>
                  <th className="text-right py-2.5 px-3">UNIQUE VISITORS</th>
                  <th className="text-right py-2.5 px-3">TOTAL VISITS</th>
                  <th className="text-left py-2.5 px-3 w-48">SHARE</th>
                  <th className="text-right py-2.5 px-3">LAST SEEN</th>
                  <th className="text-center py-2.5 px-2">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredSources.map((item) => {
                  const pct = data.totalUnique > 0
                    ? ((item.unique_count / data.totalUnique) * 100).toFixed(1)
                    : 0
                  const url = `${baseUrl}/?source=${encodeURIComponent(item.source)}`
                  const isCopied = copiedKey === `tbl-${item.source}`

                  return (
                    <tr key={item.source} className="hover:bg-white/[0.02] transition-colors">
                      {/* Source */}
                      <td className="py-2.5 px-3 font-semibold text-white">
                        <div className="flex items-center gap-2">
                          {getSourceIcon(item.source)}
                          <span className="font-mono text-cyan-300">{item.source}</span>
                          {item.source !== 'direct' && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-pink-500/10 text-pink-300 border border-pink-500/20 uppercase font-mono">
                              Tag
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Unique Visitors */}
                      <td className="py-2.5 px-3 text-right">
                        <span className="font-bungee text-sm text-white">
                          {item.unique_count.toLocaleString()}
                        </span>
                      </td>

                      {/* Total Visits */}
                      <td className="py-2.5 px-3 text-right font-mono text-white/70">
                        {item.total_count.toLocaleString()}
                      </td>

                      {/* Share Progress Bar */}
                      <td className="py-2.5 px-3">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px] text-white/60">
                            <span>{pct}%</span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-pink-500 transition-all duration-500"
                              style={{ width: `${Math.min(Number(pct), 100)}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Last Seen */}
                      <td className="py-2.5 px-3 text-right text-white/50 whitespace-nowrap">
                        {formatDate(item.last_visited_at)}
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 px-2 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => copyToClipboard(url, `tbl-${item.source}`)}
                          className="p-1.5 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors"
                          title={`Copy link for ${item.source}`}
                        >
                          {isCopied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Recent Activity Log ────────────────────────── */}
      {data.recentVisits.length > 0 && (
        <div className="admin-card space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="admin-card__title">RECENT VISIT ACTIVITY</h3>
            <span className="text-[11px] text-white/40">Last {data.recentVisits.length} visits logged</span>
          </div>

          <div className="divide-y divide-white/5">
            {data.recentVisits.map((v) => (
              <div key={v.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  {getSourceIcon(v.source)}
                  <span className="font-mono text-cyan-300 font-semibold">{v.source}</span>
                  <span className="text-white/40 truncate max-w-[200px]">
                    path: {v.landing_path || '/'}
                  </span>
                  {v.referrer && (
                    <span className="text-[10px] text-white/30 truncate max-w-[150px] hidden sm:inline">
                      via {v.referrer}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-white/50 text-[11px] flex-shrink-0">
                  <span className="font-mono text-white/30 hidden md:inline">
                    vid: {v.visitor_id ? v.visitor_id.slice(0, 8) : 'anon'}
                  </span>
                  <span>{new Date(v.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

