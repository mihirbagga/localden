import { useState, useEffect, useMemo } from 'react'
import {
  MapPin, Plus, CheckCircle2, XCircle, Edit2, Trash2,
  Users, Building2, Shield, Search, X, Sparkles,
} from 'lucide-react'
import { useToast } from '../../contexts/ToastContext'
import { useConfirm } from '../../contexts/ConfirmContext'
import { AdminEmpty, AdminBadge } from './AdminShared'
import { fetchCities, createCity, updateCity, deleteCity } from '../../lib/citiesService'
import { fetchHubs } from '../../lib/hubService'
import { logAuditEvent } from '../../lib/auditService'

export default function AdminCities({ users = [], isSuperAdmin = false }) {
  const { showToast } = useToast()
  const { confirm } = useConfirm()
  const [cities, setCities] = useState([])
  const [hubs, setHubs] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modalCity, setModalCity] = useState(null) // null | 'new' | city object
  const [formData, setFormData] = useState({
    name: '',
    display_name: '',
    short_name: '',
    state: '',
    popular_localities: '',
    is_active: true,
  })
  const [saving, setSaving] = useState(false)

  const loadData = async () => {
    setLoading(true)
    try {
      const [citiesList, hubsList] = await Promise.all([
        fetchCities(),
        fetchHubs(),
      ])
      setCities(citiesList)
      setHubs(hubsList)
    } catch (err) {
      showToast('Failed to load cities: ' + err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const openNewCityModal = () => {
    setFormData({
      name: '',
      display_name: '',
      short_name: '',
      state: '',
      popular_localities: '',
      is_active: true,
    })
    setModalCity('new')
  }

  const openEditModal = (c) => {
    setFormData({
      name: c.name,
      display_name: c.display_name || c.name,
      short_name: c.short_name || c.name,
      state: c.state || '',
      popular_localities: Array.isArray(c.popular_localities)
        ? c.popular_localities.join(', ')
        : String(c.popular_localities || ''),
      is_active: c.is_active !== false,
    })
    setModalCity(c)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!formData.name.trim()) {
      showToast('City name is required.', 'error')
      return
    }

    setSaving(true)
    try {
      const localitiesArray = formData.popular_localities
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)

      if (modalCity === 'new') {
        const created = await createCity({
          ...formData,
          popular_localities: localitiesArray,
        })
        logAuditEvent({
          action: 'city.created',
          entityType: 'city',
          entityId: created.id,
          afterData: created,
        })
        showToast(`City ${formData.name} added to operations!`, 'success')
      } else {
        const updated = await updateCity(modalCity.id, {
          name: formData.name.trim(),
          display_name: formData.display_name.trim() || formData.name.trim(),
          short_name: formData.short_name.trim() || formData.name.trim(),
          state: formData.state.trim(),
          popular_localities: localitiesArray,
          is_active: formData.is_active,
        })
        logAuditEvent({
          action: 'city.updated',
          entityType: 'city',
          entityId: modalCity.id,
          beforeData: modalCity,
          afterData: updated,
        })
        showToast(`City ${formData.name} updated!`, 'success')
      }
      setModalCity(null)
      await loadData()
    } catch (err) {
      showToast(err.message || 'Failed to save city.', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async (c) => {
    try {
      const nextActive = !c.is_active
      await updateCity(c.id, { is_active: nextActive })
      showToast(`${c.name} is now ${nextActive ? 'Active' : 'Inactive'}`, 'info')
      setCities((prev) =>
        prev.map((item) => (item.id === c.id ? { ...item, is_active: nextActive } : item))
      )
    } catch (err) {
      showToast(err.message || 'Failed to toggle status.', 'error')
    }
  }

  const handleDelete = async (c) => {
    const ok = await confirm({
      title: `Delete ${c.name}?`,
      message: 'This will remove the city from public search filters and delivery calculations. Existing bookings are preserved.',
      confirmText: 'Delete City',
      variant: 'danger',
    })
    if (!ok) return

    try {
      await deleteCity(c.id)
      showToast(`${c.name} deleted.`, 'info')
      setCities((prev) => prev.filter((item) => item.id !== c.id))
    } catch (err) {
      showToast(err.message || 'Failed to delete city.', 'error')
    }
  }

  // Regional admins mapped to cities
  const regionalAdminsByCity = useMemo(() => {
    const map = {}
    users.forEach((u) => {
      if (u.admin_role === 'regional_admin' && Array.isArray(u.assigned_cities)) {
        u.assigned_cities.forEach((cityName) => {
          const key = cityName.toLowerCase()
          if (!map[key]) map[key] = []
          map[key].push(u)
        })
      }
    })
    return map
  }, [users])

  const filteredCities = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return cities
    return cities.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.state || '').toLowerCase().includes(q) ||
        (c.popular_localities || []).some((l) => l.toLowerCase().includes(q))
    )
  }, [cities, search])

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap bg-white/5 border border-white/10 p-4 rounded-2xl">
        <div>
          <h2 className="text-base font-extrabold text-white flex items-center gap-2">
            <MapPin className="text-cyan-400" size={18} />
            Operational Cities &amp; Regions
          </h2>
          <p className="text-xs text-white/60 mt-0.5">
            Administer live operating zones, locality clusters, and assign Regional Admins.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={openNewCityModal}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 text-black font-extrabold text-xs hover:brightness-110 transition-all flex items-center gap-1.5 shadow-lg shadow-cyan-500/20"
          >
            <Plus size={14} /> Add City
          </button>
        </div>
      </div>

      {/* Search & KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        <div className="sm:col-span-2 relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
          <input
            type="text"
            placeholder="Search by city, state, or locality..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-dark w-full pl-9 text-xs py-2 rounded-xl bg-black/40 border border-white/15 text-white"
          />
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl p-3 flex items-center justify-between">
          <span className="text-xs text-white/60">Active Cities</span>
          <span className="text-base font-mono font-bold text-emerald-400">
            {cities.filter((c) => c.is_active).length} / {cities.length}
          </span>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl p-3 flex items-center justify-between">
          <span className="text-xs text-white/60">Regional Admins</span>
          <span className="text-base font-mono font-bold text-cyan-400">
            {users.filter((u) => u.admin_role === 'regional_admin').length}
          </span>
        </div>
      </div>

      {/* Cities Grid */}
      {loading ? (
        <div className="py-12 text-center text-xs text-white/50">Loading operational cities...</div>
      ) : filteredCities.length === 0 ? (
        <AdminEmpty emoji="🗺️" title="No cities found" body="Add your first operational hub or expand search." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredCities.map((c) => {
            const cityHubs = hubs.filter(
              (h) => h.city?.toLowerCase() === c.name.toLowerCase() || h.city_id === c.id
            )
            const cityAdmins = regionalAdminsByCity[c.name.toLowerCase()] || []

            return (
              <div
                key={c.id}
                className="bg-[#0e121d] border border-white/10 hover:border-cyan-500/40 rounded-2xl p-5 space-y-3 transition-all relative overflow-hidden"
              >
                {/* Status indicator bar */}
                <div
                  className={`absolute top-0 left-0 right-0 h-1 ${
                    c.is_active ? 'bg-gradient-to-r from-emerald-500 to-cyan-500' : 'bg-white/20'
                  }`}
                />

                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-extrabold text-base text-white">{c.name}</h3>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 text-white/70">
                        {c.state || 'India'}
                      </span>
                      {c.is_active ? (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          Live
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-white/10 text-white/50">
                          Paused
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-white/50 mt-0.5">{c.display_name || c.name}</p>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEditModal(c)}
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-white/70 hover:text-white transition-all"
                      title="Edit City & Localities"
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleActive(c)}
                      className={`p-1.5 rounded-lg transition-all ${
                        c.is_active
                          ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                          : 'bg-white/5 text-white/40 hover:bg-white/15'
                      }`}
                      title={c.is_active ? 'Pause City' : 'Activate City'}
                    >
                      {c.is_active ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                    </button>
                    {isSuperAdmin && (
                      <button
                        type="button"
                        onClick={() => handleDelete(c)}
                        className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all"
                        title="Delete City"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Operations Info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs bg-black/40 border border-white/5 rounded-xl p-2.5">
                  <div>
                    <span className="text-[10px] text-white/40 block">Warehouse Hubs</span>
                    <span className="font-semibold text-white flex items-center gap-1 mt-0.5">
                      <Building2 size={12} className="text-cyan-400" />
                      {cityHubs.length} {cityHubs.length === 1 ? 'Station' : 'Stations'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-white/40 block">Regional Head</span>
                    <span className="font-semibold text-white flex items-center gap-1 mt-0.5 truncate">
                      <Shield size={12} className="text-emerald-400 shrink-0" />
                      {cityAdmins.length > 0
                        ? cityAdmins.map((a) => a.full_name || a.email).join(', ')
                        : 'Unassigned'}
                    </span>
                  </div>
                </div>

                {/* Popular Localities Chips */}
                <div>
                  <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider block mb-1.5">
                    Covered Localities ({c.popular_localities?.length || 0})
                  </span>
                  <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                    {(c.popular_localities || []).map((loc) => (
                      <span
                        key={loc}
                        className="text-[10px] px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-white/80"
                      >
                        {loc}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ADD / EDIT CITY MODAL */}
      {modalCity && (
        <div
          className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setModalCity(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-lg bg-[#0e121d] border border-white/15 rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                <MapPin size={16} className="text-cyan-400" />
                {modalCity === 'new' ? 'Add Operational City' : `Edit City: ${modalCity.name}`}
              </h3>
              <button
                type="button"
                onClick={() => setModalCity(null)}
                className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white flex items-center justify-center"
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-white/70 block mb-1">
                    City Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Mumbai"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="input-dark w-full text-xs py-2 px-3 rounded-xl bg-black/40 border border-white/15 text-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-white/70 block mb-1">
                    State / Region
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Maharashtra"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="input-dark w-full text-xs py-2 px-3 rounded-xl bg-black/40 border border-white/15 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-white/70 block mb-1">
                  Display Name (shown in filters &amp; headers)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Mumbai (MMR & Suburbs)"
                  value={formData.display_name}
                  onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                  className="input-dark w-full text-xs py-2 px-3 rounded-xl bg-black/40 border border-white/15 text-white"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-white/70 block mb-1">
                  Covered Localities (comma-separated)
                </label>
                <textarea
                  rows={4}
                  placeholder="e.g. Bandra, Andheri West, Juhu, Powai, Lower Parel, BKC, Navi Mumbai"
                  value={formData.popular_localities}
                  onChange={(e) => setFormData({ ...formData, popular_localities: e.target.value })}
                  className="input-dark w-full text-xs py-2 px-3 rounded-xl bg-black/40 border border-white/15 text-white resize-none"
                />
                <p className="text-[10px] text-white/40 mt-1">
                  Rented systems will auto-detect delivery distance and origin based on these localities.
                </p>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="city-active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 rounded text-cyan-500 bg-black/40 border-white/20"
                />
                <label htmlFor="city-active" className="text-xs text-white/80 font-medium">
                  City is live and active for marketplace rentals
                </label>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setModalCity(null)}
                  className="btn-outline text-xs px-4 py-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-primary text-xs px-4 py-2"
                >
                  {saving ? 'Saving…' : modalCity === 'new' ? 'Create City' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

