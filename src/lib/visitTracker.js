import { supabase } from './supabase'

const VISITOR_ID_KEY = 'ld_visitor_id'

/**
 * Gets or creates a persistent anonymous unique visitor ID in localStorage.
 */
export function getOrCreateVisitorId() {
  try {
    let vid = localStorage.getItem(VISITOR_ID_KEY)
    if (!vid) {
      if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        vid = crypto.randomUUID()
      } else {
        vid = 'vid_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now().toString(36)
      }
      localStorage.setItem(VISITOR_ID_KEY, vid)
    }
    return vid
  } catch {
    return 'vid_fallback_' + Date.now().toString(36)
  }
}

/**
 * Inspects URL search params (?source=, ?utm_source=, ?ref=, ?src=)
 * and falls back to document.referrer if no param is provided.
 */
export function extractSource(searchString = window.location.search, referrer = (typeof document !== 'undefined' ? document.referrer : '')) {
  try {
    const params = new URLSearchParams(searchString)
    const rawParam = params.get('source') || params.get('utm_source') || params.get('ref') || params.get('src')

    if (rawParam && rawParam.trim()) {
      return {
        source: rawParam.trim().toLowerCase().slice(0, 60),
        isUrlParam: true,
        rawParam: rawParam.trim(),
      }
    }

    // Fallback: check document.referrer if external
    if (referrer) {
      try {
        const refUrl = new URL(referrer)
        const host = refUrl.hostname.toLowerCase()
        const currentHost = typeof window !== 'undefined' ? window.location.hostname.toLowerCase() : ''

        if (host && host !== currentHost) {
          if (host.includes('instagram.com')) return { source: 'instagram', isUrlParam: false }
          if (host.includes('facebook.com') || host.includes('fb.com')) return { source: 'facebook', isUrlParam: false }
          if (host.includes('whatsapp') || host.includes('wa.me')) return { source: 'whatsapp', isUrlParam: false }
          if (host.includes('twitter.com') || host.includes('x.com') || host.includes('t.co')) return { source: 'twitter', isUrlParam: false }
          if (host.includes('google.com')) return { source: 'google', isUrlParam: false }
          if (host.includes('youtube.com') || host.includes('youtu.be')) return { source: 'youtube', isUrlParam: false }
          if (host.includes('reddit.com')) return { source: 'reddit', isUrlParam: false }
          if (host.includes('linkedin.com')) return { source: 'linkedin', isUrlParam: false }

          return { source: host.replace(/^www\./, ''), isUrlParam: false }
        }
      } catch {
        // invalid referrer URL, ignore
      }
    }

    return { source: 'direct', isUrlParam: false }
  } catch {
    return { source: 'direct', isUrlParam: false }
  }
}

/**
 * Records a unique visit in Supabase.
 * Uses sessionStorage to prevent duplicate logging of the same source in the same session.
 */
export async function recordVisit(pathname = window.location.pathname, search = window.location.search) {
  try {
    const visitorId = getOrCreateVisitorId()
    const { source, isUrlParam } = extractSource(search)

    // Deduplicate within the current session for this source
    const sessionKey = `ld_tracked_${visitorId}_${source}`
    try {
      if (sessionStorage.getItem(sessionKey)) {
        return { status: 'already_tracked', source, visitorId }
      }
    } catch {
      // sessionStorage not accessible, proceed
    }

    const payload = {
      visitor_id: visitorId,
      source: source || 'direct',
      landing_path: (pathname || '/').slice(0, 200),
      referrer: typeof document !== 'undefined' && document.referrer ? document.referrer.slice(0, 300) : null,
      user_agent: typeof navigator !== 'undefined' && navigator.userAgent ? navigator.userAgent.slice(0, 300) : null,
    }

    const { error } = await supabase.from('site_visits').insert(payload)

    if (error) {
      // Table might not exist yet before migration is run
      if (/does not exist|schema cache|42P01/i.test(error.message)) {
        console.debug('site_visits table not created yet in Supabase.')
      } else {
        console.warn('Failed to record site visit:', error.message)
      }
      return { status: 'error', error: error.message, source, visitorId }
    }

    try {
      sessionStorage.setItem(sessionKey, String(Date.now()))
    } catch {
      // ignore
    }

    return { status: 'recorded', source, visitorId, isUrlParam }
  } catch (err) {
    console.debug('Visit tracking exception:', err?.message)
    return { status: 'error', error: err?.message }
  }
}

/**
 * Fetches aggregated visit statistics for the Admin panel.
 */
export async function fetchVisitAnalytics() {
  try {
    // 1. First try RPC if available
    try {
      const { data: rpcData, error: rpcErr } = await supabase.rpc('get_site_visit_summary')
      if (!rpcErr && rpcData) {
        // Also fetch recent visits for table view
        const { data: recent } = await supabase
          .from('site_visits')
          .select('id, visitor_id, source, landing_path, referrer, created_at')
          .order('created_at', { ascending: false })
          .limit(25)

        return {
          tableExists: true,
          totalUnique: Number(rpcData.total_unique || 0),
          totalVisits: Number(rpcData.total_visits || 0),
          sources: (rpcData.sources || []).map((s) => ({
            source: s.source,
            unique_count: Number(s.unique_count || 0),
            total_count: Number(s.total_count || 0),
            last_visited_at: s.last_visited_at,
          })),
          recentVisits: recent || [],
        }
      }
    } catch {
      // RPC not defined, fall back to table query
    }

    // 2. Fall back to standard table query
    const { data, error } = await supabase
      .from('site_visits')
      .select('id, visitor_id, source, landing_path, referrer, created_at')
      .order('created_at', { ascending: false })
      .limit(3000)

    if (error) {
      const missing = /does not exist|schema cache|42P01/i.test(error.message)
      return {
        tableExists: !missing,
        totalUnique: 0,
        totalVisits: 0,
        sources: [],
        recentVisits: [],
        error: error.message,
      }
    }

    const rows = data || []
    const uniqueIds = new Set(rows.map((r) => r.visitor_id))
    const totalUnique = uniqueIds.size
    const totalVisits = rows.length

    // Compute source-wise breakdown
    const sourceMap = {}
    rows.forEach((row) => {
      const src = (row.source || 'direct').trim().toLowerCase()
      if (!sourceMap[src]) {
        sourceMap[src] = {
          source: src,
          uniqueVisitors: new Set(),
          totalCount: 0,
          lastVisitedAt: row.created_at,
        }
      }
      sourceMap[src].uniqueVisitors.add(row.visitor_id)
      sourceMap[src].totalCount += 1
      if (!sourceMap[src].lastVisitedAt || new Date(row.created_at) > new Date(sourceMap[src].lastVisitedAt)) {
        sourceMap[src].lastVisitedAt = row.created_at
      }
    })

    const sources = Object.values(sourceMap)
      .map((s) => ({
        source: s.source,
        unique_count: s.uniqueVisitors.size,
        total_count: s.totalCount,
        last_visited_at: s.lastVisitedAt,
      }))
      .sort((a, b) => b.unique_count - a.unique_count)

    return {
      tableExists: true,
      totalUnique,
      totalVisits,
      sources,
      recentVisits: rows.slice(0, 25),
    }
  } catch (err) {
    return {
      tableExists: false,
      totalUnique: 0,
      totalVisits: 0,
      sources: [],
      recentVisits: [],
      error: err?.message || 'Failed to load visits',
    }
  }
}

