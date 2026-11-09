import { useState, useEffect, useMemo } from 'react'
import {
  Building2, Plus, Phone, MapPin, Users, Edit2, Trash2,
  CheckCircle2, XCircle, Send, Shield, Search, X, Clock,
  Briefcase, IndianRupee, Sparkles, Navigation, ExternalLink,
  LocateFixed, Loader2, ArrowUp, ArrowDown, ArrowLeft, ArrowRight,
  Map as MapIcon, Check,
} from 'lucide-react'
import { useToast } from '../../contexts/ToastContext'
import { useConfirm } from '../../contexts/ConfirmContext'
import { AdminEmpty, AdminBadge } from './AdminShared'
import { ROLE_LABEL } from './adminHelpers'
import { fetchHubs, createHub, updateHub, deleteHub } from '../../lib/hubService'
import { fetchCities } from '../../lib/citiesService'
import { reverseGeocode } from '../../lib/deliveryAddress'
import {
  fetchOpsStaff, addOpsStaff, updateOpsStaff, deleteOpsStaff,
  OPS_ROLES, SHIFTS, openStaffOnboardingWhatsApp,
} from '../../lib/opsStaffService'
import { logAuditEvent } from '../../lib/auditService'

// Default coordinates for key operating cities
const CITY_DEFAULTS = {
  Bengaluru: { lat: 12.9352, lng: 77.6245 },
  Gurugram: { lat: 28.4952, lng: 77.0895 },
  Delhi: { lat: 28.6139, lng: 77.2090 },
  Mumbai: { lat: 19.0760, lng: 72.8777 },
  Hyderabad: { lat: 17.3850, lng: 78.4867 },
  Pune: { lat: 18.5204, lng: 73.8567 },
  Chennai: { lat: 13.0827, lng: 80.2707 },
  Kolkata: { lat: 22.5726, lng: 88.3639 },
}

// Popular hub hubs/localities presets for quick 1-tap coordinate positioning
const POPULAR_LOCALITIES = {
  Bengaluru: [
    { name: 'Koramangala', lat: 12.9352, lng: 77.6245 },
    { name: 'Indiranagar', lat: 12.9784, lng: 77.6408 },
    { name: 'HSR Layout', lat: 12.9121, lng: 77.6446 },
    { name: 'Whitefield', lat: 12.9698, lng: 77.7500 },
    { name: 'Electronic City', lat: 12.8452, lng: 77.6602 },
  ],
  Gurugram: [
    { name: 'Cyber City', lat: 28.4952, lng: 77.0895 },
    { name: 'Golf Course Rd', lat: 28.4682, lng: 77.1009 },
    { name: 'Sector 29', lat: 28.4689, lng: 77.0620 },
    { name: 'Sohna Road', lat: 28.4184, lng: 77.0378 },
  ],
  Delhi: [
    { name: 'Connaught Place', lat: 28.6304, lng: 77.2177 },
    { name: 'Saket / South Ex', lat: 28.5244, lng: 77.2066 },
    { name: 'Dwarka', lat: 28.5921, lng: 77.0460 },
  ],
  Mumbai: [
    { name: 'BKC Bandra', lat: 19.0657, lng: 72.8687 },
    { name: 'Andheri West', lat: 19.1363, lng: 72.8277 },
    { name: 'Lower Parel', lat: 18.9953, lng: 72.8315 },
  ],
}

/**
 * Extracts latitude and longitude from Google Maps URLs, query strings, or plain text coordinates.
 */
function extractLatLng(text) {
  if (!text || typeof text !== 'string') return null
  const clean = text.trim()

  // 1. Google Maps URL with @lat,lng (e.g. https://www.google.com/maps/@12.9352,77.6245,15z)
  const atMatch = clean.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/)
  if (atMatch) {
    const lat = parseFloat(atMatch[1])
    const lng = parseFloat(atMatch[2])
    if (!isNaN(lat) && !isNaN(lng)) return { lat, lng }
  }

  // 2. Query param q=lat,lng or query=lat,lng or ll=lat,lng
  const queryMatch = clean.match(/[?&](?:q|query|ll)=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/)
  if (queryMatch) {
    const lat = parseFloat(queryMatch[1])
    const lng = parseFloat(queryMatch[2])
    if (!isNaN(lat) && !isNaN(lng)) return { lat, lng }
  }

  // 3. Plain comma or space separated: "12.9352, 77.6245" or "12.9352 77.6245"
  const plainMatch = clean.match(/^(-?\d{1,2}(?:\.\d+)?)[,\s]+(-?\d{1,3}(?:\.\d+)?)$/)
  if (plainMatch) {
    const lat = parseFloat(plainMatch[1])
    const lng = parseFloat(plainMatch[2])
    if (!isNaN(lat) && !isNaN(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
      return { lat, lng }
    }
  }

  // 4. Any lat, lng decimal sequence in string
  const anyCoordMatch = clean.match(/(-?\d{1,2}\.\d{3,})[,\s]+(-?\d{1,3}\.\d{3,})/)
  if (anyCoordMatch) {
    const lat = parseFloat(anyCoordMatch[1])
    const lng = parseFloat(anyCoordMatch[2])
    if (!isNaN(lat) && !isNaN(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
      return { lat, lng }
    }
  }

  return null
}

export default function AdminHubs({ users = [], isSuperAdmin = false }) {
  const { showToast } = useToast()
  const { confirm } = useConfirm()
  const [hubs, setHubs] = useState([])
  const [cities, setCities] = useState([])
  const [staffList, setStaffList] = useState([])
  const [loading, setLoading] = useState(true)
  const [cityFilter, setCityFilter] = useState('all')
  const [search, setSearch] = useState('')

  // Hub Create/Edit Modal
  const [modalHub, setModalHub] = useState(null) // null | 'new' | hub object
  const [hubForm, setHubForm] = useState({
    name: '',
    city: '',
    city_id: '',
    address: '',
    contact_phone: '',
    lat: 12.9352,
    lng: 77.6245,
    manager_id: '',
    notes: '',
    is_active: true,
  })
  const [savingHub, setSavingHub] = useState(false)

  // Geolocation & Map Helpers
  const [locatingGps, setLocatingGps] = useState(false)
  const [gpsFeedback, setGpsFeedback] = useState(null)
  const [mapsInput, setMapsInput] = useState('')
  const [mapsInputSuccess, setMapsInputSuccess] = useState(false)

  // Ops Staff Drawer
  const [activeStaffHub, setActiveStaffHub] = useState(null)
  const [showAddStaffForm, setShowAddStaffForm] = useState(false)
  const [staffForm, setStaffForm] = useState({
    name: '',
    phone: '',
    role: 'runner',
    shift: 'morning',
    salary: '',
    notes: '',
  })
  const [savingStaff, setSavingStaff] = useState(false)

  const loadAll = async () => {
    setLoading(true)
    try {
      const [hubsRes, citiesRes, staffRes] = await Promise.all([
        fetchHubs(),
        fetchCities(),
        fetchOpsStaff('all'),
      ])
      setHubs(hubsRes)
      setCities(citiesRes)
      setStaffList(staffRes)
    } catch (err) {
      showToast('Failed to load hubs data: ' + err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAll()
  }, [])

  // Filter managers: Only related roles (hub_manager, regional_admin, admin, super_admin)
  const eligibleManagers = useMemo(() => {
    return users.filter(
      (u) =>
        ['hub_manager', 'regional_admin', 'admin', 'super_admin'].includes(u.admin_role) ||
        Boolean(u.is_admin)
    )
  }, [users])

  const openNewHubModal = () => {
    const defaultCity = cities[0]?.name || 'Bengaluru'
    const defaultCityId = cities[0]?.id || 'bengaluru'
    const cityCoords = CITY_DEFAULTS[defaultCity] || { lat: 12.9352, lng: 77.6245 }
    setHubForm({
      name: '',
      city: defaultCity,
      city_id: defaultCityId,
      address: '',
      contact_phone: '+91 ',
      lat: cityCoords.lat,
      lng: cityCoords.lng,
      manager_id: '',
      notes: '',
      is_active: true,
    })
    setLocatingGps(false)
    setGpsFeedback(null)
    setMapsInput('')
    setMapsInputSuccess(false)
    setModalHub('new')
  }

  const openEditHubModal = (hub) => {
    setHubForm({
      name: hub.name,
      city: hub.city,
      city_id: hub.city_id || hub.city?.toLowerCase(),
      address: hub.address || '',
      contact_phone: hub.contact_phone || '',
      lat: Number(hub.lat) || 12.9352,
      lng: Number(hub.lng) || 77.6245,
      manager_id: hub.manager_id || '',
      notes: hub.notes || '',
      is_active: hub.is_active !== false,
    })
    setLocatingGps(false)
    setGpsFeedback(null)
    setMapsInput('')
    setMapsInputSuccess(false)
    setModalHub(hub)
  }

  const handleDetectGPS = () => {
    if (!navigator.geolocation) {
      showToast('Geolocation is not supported by your browser.', 'error')
      return
    }
    setLocatingGps(true)
    setGpsFeedback('Acquiring precise GPS fix from browser…')

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords
        const lat = Number(latitude.toFixed(6))
        const lng = Number(longitude.toFixed(6))

        setHubForm((prev) => ({ ...prev, lat, lng }))
        setGpsFeedback(`📍 GPS locked: ${lat}, ${lng}`)
        showToast(`Current location captured: ${lat}, ${lng}`, 'success')

        try {
          const geo = await reverseGeocode(latitude, longitude)
          if (geo) {
            setHubForm((prev) => {
              const currentAddress = prev.address?.trim() || ''
              const autoAddr =
                geo.displayName ||
                [geo.road, geo.locality, geo.city, geo.pincode].filter(Boolean).join(', ')
              const matchedCity = cities.find(
                (c) => c.name.toLowerCase() === (geo.city || '').toLowerCase()
              )
              return {
                ...prev,
                lat,
                lng,
                address: currentAddress ? currentAddress : autoAddr,
                ...(matchedCity
                  ? { city: matchedCity.name, city_id: matchedCity.id }
                  : {}),
              }
            })
            setGpsFeedback(`📍 GPS locked: ${geo.locality || geo.road || `${lat}, ${lng}`}`)
          }
        } catch {
          // ignore reverse geocoding errors, coordinates already set
        } finally {
          setLocatingGps(false)
        }
      },
      (err) => {
        setLocatingGps(false)
        let msg = 'Failed to retrieve location.'
        if (err.code === 1) msg = 'Location access denied in browser settings.'
        else if (err.code === 2) msg = 'Location unavailable.'
        else if (err.code === 3) msg = 'Location request timed out.'
        setGpsFeedback(msg)
        showToast(msg, 'error')
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    )
  }

  const handleApplyMapsInput = (inputVal) => {
    const val = inputVal || mapsInput
    if (!val || !val.trim()) return

    const parsed = extractLatLng(val)
    if (parsed) {
      setHubForm((prev) => ({
        ...prev,
        lat: Number(parsed.lat.toFixed(6)),
        lng: Number(parsed.lng.toFixed(6)),
      }))
      setMapsInputSuccess(true)
      setGpsFeedback(`📍 Location parsed: ${parsed.lat.toFixed(5)}, ${parsed.lng.toFixed(5)}`)
      showToast(`Location pin set: ${parsed.lat.toFixed(4)}, ${parsed.lng.toFixed(4)}`, 'success')
      setTimeout(() => setMapsInputSuccess(false), 3000)
    } else {
      showToast('Could not parse coordinates. Enter "lat, lng" or paste Google Maps link.', 'error')
    }
  }

  const handleSaveHub = async (e) => {
    e.preventDefault()
    if (!hubForm.name.trim() || !hubForm.city.trim()) {
      showToast('Hub name and city are required.', 'error')
      return
    }

    setSavingHub(true)
    try {
      if (modalHub === 'new') {
        const created = await createHub(hubForm)
        logAuditEvent({
          action: 'hub.created',
          entityType: 'hub',
          entityId: created.id,
          afterData: created,
        })
        showToast(`Warehouse station ${hubForm.name} created!`, 'success')
      } else {
        const updated = await updateHub(modalHub.id, hubForm)
        logAuditEvent({
          action: 'hub.updated',
          entityType: 'hub',
          entityId: modalHub.id,
          beforeData: modalHub,
          afterData: updated,
        })
        showToast(`Hub ${hubForm.name} updated!`, 'success')
      }
      setModalHub(null)
      await loadAll()
    } catch (err) {
      showToast(err.message || 'Failed to save hub.', 'error')
    } finally {
      setSavingHub(false)
    }
  }

  const handleToggleHubActive = async (hub) => {
    try {
      const nextActive = !hub.is_active
      await updateHub(hub.id, { is_active: nextActive })
      showToast(`${hub.name} is now ${nextActive ? 'Active' : 'Paused'}`, 'info')
      setHubs((prev) =>
        prev.map((h) => (h.id === hub.id ? { ...h, is_active: nextActive } : h))
      )
    } catch (err) {
      showToast(err.message || 'Failed to toggle status.', 'error')
    }
  }

  const handleDeleteHub = async (hub) => {
    const ok = await confirm({
      title: `Delete ${hub.name}?`,
      message: 'This will remove the dispatch hub and unlink its field operations staff.',
      confirmText: 'Delete Hub',
      variant: 'danger',
    })
    if (!ok) return

    try {
      await deleteHub(hub.id)
      showToast(`${hub.name} deleted.`, 'info')
      setHubs((prev) => prev.filter((h) => h.id !== hub.id))
      if (activeStaffHub?.id === hub.id) setActiveStaffHub(null)
    } catch (err) {
      showToast(err.message || 'Failed to delete hub.', 'error')
    }
  }

  // Ops Staff actions
  const handleAddStaff = async (e) => {
    e.preventDefault()
    if (!staffForm.name.trim() || !staffForm.phone.trim()) {
      showToast('Staff name and contact phone are required.', 'error')
      return
    }

    setSavingStaff(true)
    try {
      const newStaff = await addOpsStaff({
        ...staffForm,
        hub_id: activeStaffHub.id,
      })
      logAuditEvent({
        action: 'staff.hired',
        entityType: 'ops_staff',
        entityId: newStaff.id,
        afterData: newStaff,
      })
      showToast(`${staffForm.name} added to ${activeStaffHub.name}!`, 'success')
      setStaffForm({
        name: '',
        phone: '',
        role: 'runner',
        shift: 'morning',
        salary: '',
        notes: '',
      })
      setShowAddStaffForm(false)
      const refreshed = await fetchOpsStaff('all')
      setStaffList(refreshed)
    } catch (err) {
      showToast(err.message || 'Failed to hire staff.', 'error')
    } finally {
      setSavingStaff(false)
    }
  }

  const handleToggleStaffActive = async (staff) => {
    try {
      const nextActive = !staff.is_active
      await updateOpsStaff(staff.id, { is_active: nextActive })
      showToast(`${staff.name} is now ${nextActive ? 'Active' : 'On Leave'}`, 'info')
      setStaffList((prev) =>
        prev.map((s) => (s.id === staff.id ? { ...s, is_active: nextActive } : s))
      )
    } catch (err) {
      showToast(err.message || 'Failed to update staff status.', 'error')
    }
  }

  const handleDeleteStaff = async (staff) => {
    const ok = await confirm({
      title: `Remove ${staff.name}?`,
      message: 'This will deactivate their staff record from this hub.',
      confirmText: 'Remove Staff',
      variant: 'danger',
    })
    if (!ok) return

    try {
      await deleteOpsStaff(staff.id)
      showToast(`${staff.name} removed from hub roster.`, 'info')
      setStaffList((prev) => prev.filter((s) => s.id !== staff.id))
    } catch (err) {
      showToast(err.message || 'Failed to remove staff.', 'error')
    }
  }

  const filteredHubs = useMemo(() => {
    let list = hubs
    if (cityFilter !== 'all') {
      list = list.filter((h) => h.city?.toLowerCase() === cityFilter.toLowerCase())
    }
    const q = search.trim().toLowerCase()
    if (!q) return list
    return list.filter(
      (h) =>
        h.name.toLowerCase().includes(q) ||
        h.city.toLowerCase().includes(q) ||
        (h.address || '').toLowerCase().includes(q)
    )
  }, [hubs, cityFilter, search])

  // Active staff filtered for drawer
  const activeHubStaff = useMemo(() => {
    if (!activeStaffHub) return []
    return staffList.filter((s) => s.hub_id === activeStaffHub.id)
  }, [activeStaffHub, staffList])

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex items-center justify-between gap-3 flex-wrap bg-white/5 border border-white/10 p-4 rounded-2xl">
        <div>
          <h2 className="text-base font-extrabold text-white flex items-center gap-2">
            <Building2 className="text-emerald-400" size={18} />
            Warehouse Hubs &amp; Operations Staff
          </h2>
          <p className="text-xs text-white/60 mt-0.5">
            Manage physical dispatch stations, coordinate hub managers, and hire ground staff (runners, pickers, packers).
          </p>
        </div>

        <button
          type="button"
          onClick={openNewHubModal}
          className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-black font-extrabold text-xs hover:brightness-110 transition-all flex items-center gap-1.5 shadow-lg shadow-emerald-500/20"
        >
          <Plus size={14} /> Create Dispatch Hub
        </button>
      </div>

      {/* Filter and Search */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1 flex-nowrap sm:flex-wrap no-scrollbar">
          <button
            type="button"
            onClick={() => setCityFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all ${
              cityFilter === 'all'
                ? 'bg-cyan-500 text-black'
                : 'bg-white/5 text-white/70 hover:bg-white/10'
            }`}
          >
            All Cities ({hubs.length})
          </button>
          {cities.map((c) => {
            const count = hubs.filter((h) => h.city?.toLowerCase() === c.name.toLowerCase()).length
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setCityFilter(c.name)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all ${
                  cityFilter.toLowerCase() === c.name.toLowerCase()
                    ? 'bg-cyan-500 text-black'
                    : 'bg-white/5 text-white/70 hover:bg-white/10'
                }`}
              >
                {c.name} ({count})
              </button>
            )
          })}
        </div>

        <div className="relative w-full sm:w-auto sm:min-w-[240px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
          <input
            type="text"
            placeholder="Search hubs by name or address..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-dark w-full pl-9 text-xs py-1.5 rounded-xl bg-black/40 border border-white/15 text-white"
          />
        </div>
      </div>

      {/* Hubs Grid */}
      {loading ? (
        <div className="py-12 text-center text-xs text-white/50">Loading warehouse hubs...</div>
      ) : filteredHubs.length === 0 ? (
        <AdminEmpty emoji="🏢" title="No hubs found" body="Create your first regional dispatch hub." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredHubs.map((hub) => {
            const currentStaff = staffList.filter((s) => s.hub_id === hub.id)
            const activeStaffCount = currentStaff.filter((s) => s.is_active).length
            const manager = hub.manager || users.find((u) => u.id === hub.manager_id)

            return (
              <div
                key={hub.id}
                className="bg-[#0e121d] border border-white/10 hover:border-emerald-500/40 rounded-2xl p-5 space-y-4 transition-all relative overflow-hidden"
              >
                {/* Status Bar */}
                <div
                  className={`absolute top-0 left-0 right-0 h-1 ${
                    hub.is_active
                      ? 'bg-gradient-to-r from-emerald-500 to-cyan-500'
                      : 'bg-white/20'
                  }`}
                />

                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-extrabold text-base text-white">{hub.name}</h3>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 text-white/70">
                        {hub.city}
                      </span>
                      {hub.is_active ? (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          Active Station
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-white/10 text-white/50">
                          Offline
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-white/60 flex items-center gap-1 mt-1">
                      <MapPin size={12} className="text-cyan-400 shrink-0" />
                      {hub.address || 'Address not configured'}
                    </p>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEditHubModal(hub)}
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-white/70 hover:text-white"
                      title="Edit Hub Details"
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleHubActive(hub)}
                      className={`p-1.5 rounded-lg transition-all ${
                        hub.is_active
                          ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                          : 'bg-white/5 text-white/40 hover:bg-white/15'
                      }`}
                      title={hub.is_active ? 'Pause Hub' : 'Activate Hub'}
                    >
                      {hub.is_active ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                    </button>
                    {isSuperAdmin && (
                      <button
                        type="button"
                        onClick={() => handleDeleteHub(hub)}
                        className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20"
                        title="Delete Hub"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Hub Manager & Contact Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs bg-black/40 border border-white/5 rounded-xl p-3">
                  <div>
                    <span className="text-[10px] text-white/40 block">Hub Station Manager</span>
                    <span className="font-semibold text-white flex items-center gap-1 mt-0.5 truncate">
                      <Shield size={12} className="text-amber-400 shrink-0" />
                      {manager ? (manager.full_name || manager.email) : 'Unassigned'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-white/40 block">Dispatch Phone</span>
                    <span className="font-mono text-white flex items-center gap-1 mt-0.5 truncate">
                      <Phone size={12} className="text-emerald-400 shrink-0" />
                      {hub.contact_phone || '—'}
                    </span>
                  </div>
                </div>

                {/* Coordinates & Ops Staff CTA */}
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/10 flex-wrap">
                  <a
                    href={`https://www.google.com/maps?q=${hub.lat},${hub.lng}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 text-[11px] text-white/50 hover:text-cyan-400 font-mono transition-colors group"
                    title="Open hub location in Google Maps"
                  >
                    <Navigation size={11} className="text-cyan-400 shrink-0 group-hover:scale-110 transition-transform" />
                    <span>Lat: {Number(hub.lat).toFixed(4)}, Lng: {Number(hub.lng).toFixed(4)}</span>
                    <ExternalLink size={9} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                  </a>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveStaffHub(hub)
                      setShowAddStaffForm(false)
                    }}
                    className="w-full sm:w-auto px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs flex items-center justify-center gap-1.5 border border-white/10 transition-all sm:ml-auto"
                  >
                    <Users size={13} className="text-emerald-400 shrink-0" />
                    Manage Ops Staff ({activeStaffCount})
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* CREATE / EDIT HUB MODAL */}
      {modalHub && (
        <div
          className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setModalHub(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-xl bg-[#0e121d] border border-white/15 rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="font-extrabold text-sm sm:text-base text-white flex items-center gap-2">
                <Building2 size={16} className="text-emerald-400" />
                {modalHub === 'new' ? 'Create Dispatch Station Hub' : `Edit: ${modalHub.name}`}
              </h3>
              <button
                type="button"
                onClick={() => setModalHub(null)}
                className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white flex items-center justify-center"
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleSaveHub} className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-white/70 block mb-1">
                  Hub Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. LocalDen Indiranagar Dispatch Hub"
                  value={hubForm.name}
                  onChange={(e) => setHubForm({ ...hubForm, name: e.target.value })}
                  className="input-dark w-full text-xs py-2 px-3 rounded-xl bg-black/40 border border-white/15 text-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-white/70 block mb-1">
                    Operating City *
                  </label>
                  <select
                    value={hubForm.city}
                    onChange={(e) => {
                      const cityName = e.target.value
                      const matched = cities.find((c) => c.name === cityName)
                      const cityCoords = CITY_DEFAULTS[cityName]
                      setHubForm((prev) => ({
                        ...prev,
                        city: cityName,
                        city_id: matched?.id || cityName.toLowerCase(),
                        ...(modalHub === 'new' && cityCoords
                          ? { lat: cityCoords.lat, lng: cityCoords.lng }
                          : {}),
                      }))
                    }}
                    className="select-dark w-full text-xs py-2 px-3 rounded-xl bg-black/40 border border-white/15 text-white"
                  >
                    {cities.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-white/70 block mb-1">
                    Dispatch Phone
                  </label>
                  <input
                    type="text"
                    placeholder="+91 98765 43210"
                    value={hubForm.contact_phone}
                    onChange={(e) => setHubForm({ ...hubForm, contact_phone: e.target.value })}
                    className="input-dark w-full text-xs py-2 px-3 rounded-xl bg-black/40 border border-white/15 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-white/70 block mb-1">
                  Complete Physical Address *
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="Door/plot no, street, locality, landmark, pincode"
                  value={hubForm.address}
                  onChange={(e) => setHubForm({ ...hubForm, address: e.target.value })}
                  className="input-dark w-full text-xs py-2 px-3 rounded-xl bg-black/40 border border-white/15 text-white resize-none"
                />
              </div>

              {/* HUB GEOLOCATION & MAP PIN SECTION */}
              <div className="bg-black/50 border border-white/10 rounded-2xl p-3.5 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <MapIcon size={14} className="text-cyan-400" />
                      Hub Geolocation &amp; Map Pin
                    </span>
                    <p className="text-[10px] text-white/50">
                      Calculates delivery fees, rider distances &amp; customer pickup routes
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleDetectGPS}
                    disabled={locatingGps}
                    className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 hover:from-emerald-500/30 hover:to-cyan-500/30 text-emerald-300 font-bold text-xs flex items-center gap-1.5 border border-emerald-500/30 shadow-sm transition-all disabled:opacity-50"
                  >
                    {locatingGps ? (
                      <>
                        <Loader2 size={13} className="animate-spin text-emerald-400" />
                        <span>Detecting GPS…</span>
                      </>
                    ) : (
                      <>
                        <LocateFixed size={13} className="text-emerald-400" />
                        <span>Use Current Location</span>
                      </>
                    )}
                  </button>
                </div>

                {gpsFeedback && (
                  <div className="text-[11px] px-2.5 py-1.5 rounded-xl bg-white/5 border border-white/10 text-cyan-300 flex items-center gap-1.5 font-mono">
                    <span>{gpsFeedback}</span>
                  </div>
                )}

                {/* Paste Google Maps Link or Coords */}
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-white/60 block">
                    Paste Google Maps Pin Link or Raw Coordinates
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="e.g. 12.9352, 77.6245 or https://maps.app.goo.gl/..."
                      value={mapsInput}
                      onChange={(e) => {
                        const val = e.target.value
                        setMapsInput(val)
                        const parsed = extractLatLng(val)
                        if (parsed) {
                          setHubForm((prev) => ({
                            ...prev,
                            lat: Number(parsed.lat.toFixed(6)),
                            lng: Number(parsed.lng.toFixed(6)),
                          }))
                          setMapsInputSuccess(true)
                          setGpsFeedback(`📍 Location parsed: ${parsed.lat.toFixed(5)}, ${parsed.lng.toFixed(5)}`)
                        }
                      }}
                      className="input-dark flex-1 text-xs py-1.5 px-3 rounded-xl bg-black/60 border border-white/15 text-white placeholder-white/30 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => handleApplyMapsInput()}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all shrink-0 ${
                        mapsInputSuccess
                          ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                          : 'bg-white/10 border-white/15 text-white hover:bg-white/15'
                      }`}
                    >
                      {mapsInputSuccess ? 'Applied!' : 'Apply'}
                    </button>
                  </div>
                </div>

                {/* Interactive Map Pin Preview (OpenStreetMap) */}
                <div className="relative rounded-xl overflow-hidden border border-white/15 bg-slate-950">
                  <iframe
                    title="Hub Location Map Pin"
                    width="100%"
                    height="180"
                    frameBorder="0"
                    scrolling="no"
                    marginHeight="0"
                    marginWidth="0"
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${((Number(hubForm.lng) || 77.6245) - 0.008).toFixed(6)}%2C${((Number(hubForm.lat) || 12.9352) - 0.005).toFixed(6)}%2C${((Number(hubForm.lng) || 77.6245) + 0.008).toFixed(6)}%2C${((Number(hubForm.lat) || 12.9352) + 0.005).toFixed(6)}&layer=mapnik&marker=${(Number(hubForm.lat) || 12.9352).toFixed(6)}%2C${(Number(hubForm.lng) || 77.6245).toFixed(6)}`}
                    className="w-full h-44 block pointer-events-auto"
                  />

                  {/* Floating Map Pin Info & Google Maps CTA */}
                  <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between gap-2 pointer-events-none">
                    <div className="px-2 py-1 rounded-lg bg-black/85 backdrop-blur-md border border-white/15 text-[10px] font-mono text-white/90 shadow pointer-events-auto">
                      📍 {(Number(hubForm.lat) || 12.9352).toFixed(5)}, {(Number(hubForm.lng) || 77.6245).toFixed(5)}
                    </div>

                    <a
                      href={`https://www.google.com/maps?q=${Number(hubForm.lat) || 12.9352},${Number(hubForm.lng) || 77.6245}`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-2.5 py-1 rounded-lg bg-black/85 hover:bg-black backdrop-blur-md border border-cyan-500/30 text-[10px] font-bold text-cyan-300 hover:text-cyan-200 flex items-center gap-1 shadow transition-all pointer-events-auto"
                    >
                      <span>Open in Google Maps</span>
                      <ExternalLink size={10} />
                    </a>
                  </div>
                </div>

                {/* Popular Locality Presets for Current City */}
                {POPULAR_LOCALITIES[hubForm.city] && (
                  <div className="space-y-1">
                    <span className="text-[10px] text-white/50 block font-medium">
                      Quick Locality Presets for {hubForm.city}:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {POPULAR_LOCALITIES[hubForm.city].map((loc) => (
                        <button
                          key={loc.name}
                          type="button"
                          onClick={() => {
                            setHubForm((prev) => ({ ...prev, lat: loc.lat, lng: loc.lng }))
                            setGpsFeedback(`📍 Location set to ${loc.name} (${loc.lat}, ${loc.lng})`)
                          }}
                          className="px-2 py-0.5 rounded-lg text-[10px] font-medium bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 transition-all"
                        >
                          {loc.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Micro-nudge & Coordinates Inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-bold text-white/70">
                        Latitude
                      </label>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          title="Nudge North (+0.001)"
                          onClick={() => setHubForm((prev) => ({ ...prev, lat: Number(((Number(prev.lat) || 0) + 0.001).toFixed(6)) }))}
                          className="p-1 rounded bg-white/5 hover:bg-white/10 text-white/60 hover:text-white"
                        >
                          <ArrowUp size={11} />
                        </button>
                        <button
                          type="button"
                          title="Nudge South (-0.001)"
                          onClick={() => setHubForm((prev) => ({ ...prev, lat: Number(((Number(prev.lat) || 0) - 0.001).toFixed(6)) }))}
                          className="p-1 rounded bg-white/5 hover:bg-white/10 text-white/60 hover:text-white"
                        >
                          <ArrowDown size={11} />
                        </button>
                      </div>
                    </div>
                    <input
                      type="number"
                      step="0.0001"
                      value={hubForm.lat}
                      onChange={(e) => setHubForm({ ...hubForm, lat: parseFloat(e.target.value) || 0 })}
                      className="input-dark w-full text-xs py-2 px-3 rounded-xl bg-black/40 border border-white/15 text-white font-mono"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-bold text-white/70">
                        Longitude
                      </label>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          title="Nudge West (-0.001)"
                          onClick={() => setHubForm((prev) => ({ ...prev, lng: Number(((Number(prev.lng) || 0) - 0.001).toFixed(6)) }))}
                          className="p-1 rounded bg-white/5 hover:bg-white/10 text-white/60 hover:text-white"
                        >
                          <ArrowLeft size={11} />
                        </button>
                        <button
                          type="button"
                          title="Nudge East (+0.001)"
                          onClick={() => setHubForm((prev) => ({ ...prev, lng: Number(((Number(prev.lng) || 0) + 0.001).toFixed(6)) }))}
                          className="p-1 rounded bg-white/5 hover:bg-white/10 text-white/60 hover:text-white"
                        >
                          <ArrowRight size={11} />
                        </button>
                      </div>
                    </div>
                    <input
                      type="number"
                      step="0.0001"
                      value={hubForm.lng}
                      onChange={(e) => setHubForm({ ...hubForm, lng: parseFloat(e.target.value) || 0 })}
                      className="input-dark w-full text-xs py-2 px-3 rounded-xl bg-black/40 border border-white/15 text-white font-mono"
                    />
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-white/70">
                    Assign Hub Manager
                  </label>
                  <span className="text-[10px] text-white/40 font-mono">
                    Managerial roles only
                  </span>
                </div>
                <select
                  value={hubForm.manager_id}
                  onChange={(e) => setHubForm({ ...hubForm, manager_id: e.target.value })}
                  className="select-dark w-full text-xs py-2 px-3 rounded-xl bg-black/40 border border-white/15 text-white"
                >
                  <option value="">— Unassigned (Super Admin managed) —</option>
                  {eligibleManagers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.full_name || u.email} ({ROLE_LABEL[u.admin_role] || 'Manager'})
                    </option>
                  ))}
                </select>
                {eligibleManagers.length === 0 && (
                  <p className="text-[10px] text-amber-400 mt-1">
                    No managerial accounts found. Set user role to &apos;Hub Manager&apos; or &apos;Regional Admin&apos; in the Users tab first.
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="hub-active-checkbox"
                  checked={hubForm.is_active}
                  onChange={(e) => setHubForm({ ...hubForm, is_active: e.target.checked })}
                  className="w-4 h-4 rounded text-emerald-500 bg-black/40 border-white/20"
                />
                <label htmlFor="hub-active-checkbox" className="text-xs text-white/80 font-medium">
                  Hub is active for live dispatch and customer pickups
                </label>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setModalHub(null)}
                  className="btn-outline text-xs px-4 py-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingHub}
                  className="btn-primary text-xs px-4 py-2"
                >
                  {savingHub ? 'Saving…' : modalHub === 'new' ? 'Create Hub' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* OPS STAFF DRAWER (Per Hub) */}
      {activeStaffHub && (
        <div
          className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex justify-end"
          onClick={() => setActiveStaffHub(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full sm:max-w-xl bg-[#0d1018] border-l border-white/15 h-full overflow-y-auto p-4 sm:p-6 space-y-4 text-xs shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="flex items-start justify-between border-b border-white/10 pb-3 gap-2">
              <div className="min-w-0 pr-2">
                <span className="text-[10px] uppercase tracking-widest text-emerald-400 font-bold block">
                  Ground Operations Roster
                </span>
                <h3 className="font-extrabold text-sm sm:text-base text-white mt-0.5 truncate">
                  {activeStaffHub.name}
                </h3>
                <p className="text-[11px] text-white/50 truncate">{activeStaffHub.address}</p>
              </div>
              <button
                type="button"
                onClick={() => setActiveStaffHub(null)}
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center shrink-0 transition-all"
                title="Close drawer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Quick Action: Hire Staff */}
            <div className="flex items-center justify-between">
              <span className="font-bold text-white text-xs">
                Active Staff ({activeHubStaff.length})
              </span>
              <button
                type="button"
                onClick={() => setShowAddStaffForm(!showAddStaffForm)}
                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-black font-extrabold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-500/20"
              >
                <Plus size={13} /> {showAddStaffForm ? 'Close Form' : 'Hire Ground Staff'}
              </button>
            </div>

            {/* Hire Form */}
            {showAddStaffForm && (
              <form
                onSubmit={handleAddStaff}
                className="bg-black/40 border border-emerald-500/30 rounded-2xl p-4 space-y-3"
              >
                <h4 className="font-bold text-xs text-emerald-400 flex items-center gap-1.5">
                  <Sparkles size={13} /> Onboard New Operations Staff
                </h4>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[10px] text-white/60 block mb-1">Full Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ramesh Kumar"
                      value={staffForm.name}
                      onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })}
                      className="input-dark w-full text-xs py-1.5 px-2.5 rounded-lg bg-black/60 border border-white/15 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-white/60 block mb-1">Phone Number *</label>
                    <input
                      type="text"
                      required
                      placeholder="+91 98765 43210"
                      value={staffForm.phone}
                      onChange={(e) => setStaffForm({ ...staffForm, phone: e.target.value })}
                      className="input-dark w-full text-xs py-1.5 px-2.5 rounded-lg bg-black/60 border border-white/15 text-white font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[10px] text-white/60 block mb-1">Role *</label>
                    <select
                      value={staffForm.role}
                      onChange={(e) => setStaffForm({ ...staffForm, role: e.target.value })}
                      className="select-dark w-full text-xs py-1.5 px-2.5 rounded-lg bg-black/60 border border-white/15 text-white"
                    >
                      {OPS_ROLES.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-white/60 block mb-1">Shift</label>
                    <select
                      value={staffForm.shift}
                      onChange={(e) => setStaffForm({ ...staffForm, shift: e.target.value })}
                      className="select-dark w-full text-xs py-1.5 px-2.5 rounded-lg bg-black/60 border border-white/15 text-white"
                    >
                      {SHIFTS.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[10px] text-white/60 block mb-1">
                      Monthly Salary (₹)
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 18000"
                      value={staffForm.salary}
                      onChange={(e) => setStaffForm({ ...staffForm, salary: e.target.value })}
                      className="input-dark w-full text-xs py-1.5 px-2.5 rounded-lg bg-black/60 border border-white/15 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-white/60 block mb-1">Internal Notes</label>
                    <input
                      type="text"
                      placeholder="e.g. Ather 450X EV, DL verified"
                      value={staffForm.notes}
                      onChange={(e) => setStaffForm({ ...staffForm, notes: e.target.value })}
                      className="input-dark w-full text-xs py-1.5 px-2.5 rounded-lg bg-black/60 border border-white/15 text-white"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setShowAddStaffForm(false)}
                    className="btn-outline text-[11px] px-3 py-1.5"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingStaff}
                    className="btn-primary text-[11px] px-3.5 py-1.5"
                  >
                    {savingStaff ? 'Hiring…' : 'Hire & Add to Hub'}
                  </button>
                </div>
              </form>
            )}

            {/* Staff List */}
            {activeHubStaff.length === 0 ? (
              <AdminEmpty
                emoji="👥"
                title="No staff onboarded"
                body="Hire runners, pickers, and packers for this station."
              />
            ) : (
              <div className="space-y-2.5">
                {activeHubStaff.map((staff) => {
                  const roleMeta = OPS_ROLES.find((r) => r.id === staff.role) || {
                    label: staff.role,
                  }
                  const shiftMeta = SHIFTS.find((s) => s.id === staff.shift) || {
                    label: staff.shift,
                  }

                  return (
                    <div
                      key={staff.id}
                      className="bg-black/30 border border-white/10 rounded-xl p-3 space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-extrabold text-white text-xs">
                              {staff.name}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30">
                              {roleMeta.label}
                            </span>
                            {staff.is_active ? (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 font-bold">
                                On Duty
                              </span>
                            ) : (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-white/10 text-white/50">
                                Off
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-[11px] text-white/50 mt-1 font-mono">
                            <span className="flex items-center gap-1">
                              <Phone size={11} className="text-white/40" />
                              {staff.phone}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock size={11} className="text-white/40" />
                              {shiftMeta.label}
                            </span>
                            {staff.salary > 0 && (
                              <span className="flex items-center gap-0.5 text-emerald-400">
                                <IndianRupee size={11} />
                                {Number(staff.salary).toLocaleString('en-IN')}/mo
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1">
                          <a
                            href={openStaffOnboardingWhatsApp(staff, activeStaffHub)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 transition-all flex items-center gap-1 text-[10px] font-bold"
                            title="Send WhatsApp Onboarding Welcome"
                          >
                            <Send size={11} /> WA Welcome
                          </a>
                          <button
                            type="button"
                            onClick={() => handleToggleStaffActive(staff)}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-white/70 hover:text-white"
                            title={staff.is_active ? 'Mark Off-Duty' : 'Mark On-Duty'}
                          >
                            {staff.is_active ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteStaff(staff)}
                            className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20"
                            title="Remove staff"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>

                      {staff.notes && (
                        <p className="text-[10px] text-white/40 italic border-t border-white/5 pt-1 mt-1">
                          Note: {staff.notes}
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

