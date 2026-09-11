import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Minus, Plus, Save } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../contexts/ToastContext'
import { AdminBadge, AdminEmpty, AdminSearch, matchesQuery } from './AdminShared'
import { isLowStock } from './adminHelpers'

function toQty(value) {
  const n = parseInt(value, 10)
  if (Number.isNaN(n) || n < 0) return 0
  return n
}

export default function AdminStock({ listings, patchListing }) {
  const { showToast } = useToast()
  const [query, setQuery] = useState('')
  const [drafts, setDrafts] = useState({})
  const [savingId, setSavingId] = useState(null)

  const filtered = useMemo(() => (
    listings.filter((l) => matchesQuery([l.title, l.location, l.brand, l.model], query))
  ), [listings, query])
  const lowCount = filtered.filter(isLowStock).length

  const getDraft = (listing) => drafts[listing.id] || {
    stockQty: listing.stock_qty ?? 1,
    stockTotal: listing.stock_total ?? listing.stock_qty ?? 1,
  }

  const setField = (listing, field, value) => {
    const current = getDraft(listing)
    setDrafts((prev) => ({
      ...prev,
      [listing.id]: { ...current, [field]: value },
    }))
  }

  const bump = (listing, field, delta) => {
    const current = getDraft(listing)
    const next = Math.max(0, toQty(current[field]) + delta)
    setField(listing, field, next)
  }

  const saveStock = async (listing) => {
    const draft = getDraft(listing)
    const stockQty = toQty(draft.stockQty)
    const stockTotal = Math.max(stockQty, toQty(draft.stockTotal))
    setSavingId(listing.id)
    const { error } = await supabase
      .from('listings')
      .update({
        stock_qty: stockQty,
        stock_total: stockTotal,
        updated_at: new Date().toISOString(),
      })
      .eq('id', listing.id)
    setSavingId(null)
    if (error) {
      showToast(error.message, 'error')
      return
    }
    patchListing(listing.id, { stock_qty: stockQty, stock_total: stockTotal })
    setDrafts((prev) => {
      const next = { ...prev }
      delete next[listing.id]
      return next
    })
    showToast(`Stock updated for ${listing.title}`, 'success')
  }

  return (
    <div>
      <div className="admin-toolbar">
        <AdminSearch
          value={query}
          onChange={setQuery}
          placeholder="Search stock by title or brand…"
          ariaLabel="Search stock details"
        />
        <p className="admin-muted">{lowCount} low-stock item{lowCount === 1 ? '' : 's'}</p>
      </div>

      {filtered.length === 0 ? (
        <AdminEmpty emoji="📦" title="No stock rows" body="Listing inventory shows here." />
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>In stock</th>
                <th>Total units</th>
                <th>Status</th>
                <th>Save</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((listing) => {
                const draft = getDraft(listing)
                const low = toQty(draft.stockQty) <= 1
                return (
                  <tr key={listing.id} className={low ? 'admin-row--low' : undefined}>
                    <td>
                      <Link to={`/listing/${listing.id}`} className="admin-link">
                        {listing.emoji || '🎮'} {listing.title}
                      </Link>
                      <span className="admin-cell-sub">{listing.brand || listing.subcategory} · {listing.location}</span>
                    </td>
                    <td>
                      <div className="admin-stock-row">
                        <button
                          type="button"
                          className="admin-icon-btn"
                          aria-label={`Decrease stock for ${listing.title}`}
                          onClick={() => bump(listing, 'stockQty', -1)}
                        >
                          <Minus size={12} />
                        </button>
                        <input
                          className="input-dark admin-stock-input"
                          type="number"
                          min="0"
                          value={draft.stockQty}
                          aria-label={`In-stock quantity for ${listing.title}`}
                          onChange={(e) => setField(listing, 'stockQty', e.target.value)}
                        />
                        <button
                          type="button"
                          className="admin-icon-btn"
                          aria-label={`Increase stock for ${listing.title}`}
                          onClick={() => bump(listing, 'stockQty', 1)}
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                    </td>
                    <td>
                      <input
                        className="input-dark admin-stock-input"
                        type="number"
                        min="0"
                        value={draft.stockTotal}
                        aria-label={`Total units for ${listing.title}`}
                        onChange={(e) => setField(listing, 'stockTotal', e.target.value)}
                      />
                    </td>
                    <td>
                      {low
                        ? <AdminBadge kind="low">Low</AdminBadge>
                        : <AdminBadge kind="live">OK</AdminBadge>}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="admin-icon-btn admin-icon-btn--on"
                        aria-label={`Save stock for ${listing.title}`}
                        disabled={savingId === listing.id}
                        onClick={() => saveStock(listing)}
                      >
                        <Save size={14} />
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
  )
}
