import { useEffect, useState } from 'react'
import { Truck, Plus, Phone, Star, CheckCircle, XCircle, Trash2, Edit2, Shield, MapPin, X } from 'lucide-react'
import { useToast } from '../../contexts/ToastContext'
import {
  fetchDeliveryPartners,
  addDeliveryPartner,
  updateDeliveryPartner,
  deleteDeliveryPartner,
} from '../../lib/driverService'

export default function AdminDrivers() {
  const { showToast } = useToast()
  const [drivers, setDrivers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    name: '',
    phone: '',
    vehicle_type: 'Electric Scooter (Ather/Ola)',
    vehicle_number: '',
    area: 'Central Bangalore',
    avatar: '',
  })

  const loadDrivers = async () => {
    setLoading(true)
    const list = await fetchDeliveryPartners()
    setDrivers(list)
    setLoading(false)
  }

  useEffect(() => {
    loadDrivers()
  }, [])

  const handleAddDriver = async (e) => {
    e.preventDefault()
    if (!form.name.trim() || !form.phone.trim() || !form.vehicle_number.trim()) {
      showToast('Please provide driver name, phone, and vehicle number.', 'error')
      return
    }

    setSaving(true)
    try {
      await addDeliveryPartner(form)
      showToast(`Driver ${form.name} added to portal!`, 'success')
      setShowAddModal(false)
      setForm({
        name: '',
        phone: '',
        vehicle_type: 'Electric Scooter (Ather/Ola)',
        vehicle_number: '',
        area: 'Central Bangalore',
        avatar: '',
      })
      await loadDrivers()
    } catch (err) {
      showToast(err.message || 'Failed to add driver.', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async (driver) => {
    try {
      await updateDeliveryPartner(driver.id, { is_active: !driver.is_active })
      setDrivers((prev) =>
        prev.map((d) => (d.id === driver.id ? { ...d, is_active: !d.is_active } : d))
      )
      showToast(`Driver status set to ${!driver.is_active ? 'Active' : 'Inactive'}`, 'success')
    } catch (err) {
      showToast(err.message || 'Failed to update status', 'error')
    }
  }

  const handleDelete = async (driver) => {
    if (!window.confirm(`Remove ${driver.name} from delivery partners?`)) return
    try {
      await deleteDeliveryPartner(driver.id)
      setDrivers((prev) => prev.filter((d) => d.id !== driver.id))
      showToast(`Driver ${driver.name} removed`, 'success')
    } catch (err) {
      showToast(err.message || 'Failed to delete driver', 'error')
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Banner & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-bungee text-xl text-white flex items-center gap-2">
            <Truck className="text-cyan-400" /> Delivery Partners Portal
          </h2>
          <p className="admin-muted text-xs">
            Manage authorized couriers and delivery personnel who handle physical system handovers. Only Admin can assign delivery partners.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="btn-primary flex items-center gap-2 text-xs py-2.5 px-4 font-bold self-start sm:self-auto"
        >
          <Plus size={16} /> Add Delivery Partner
        </button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="admin-card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Truck size={20} />
          </div>
          <div>
            <span className="text-[10px] text-white/50 uppercase font-bold block">Total Drivers</span>
            <span className="font-bungee text-xl text-white">{drivers.length}</span>
          </div>
        </div>
        <div className="admin-card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <CheckCircle size={20} />
          </div>
          <div>
            <span className="text-[10px] text-white/50 uppercase font-bold block">Active On Duty</span>
            <span className="font-bungee text-xl text-emerald-400">
              {drivers.filter((d) => d.is_active).length}
            </span>
          </div>
        </div>
        <div className="admin-card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-pink-500/10 border border-pink-500/30 flex items-center justify-center text-pink-400">
            <Shield size={20} />
          </div>
          <div>
            <span className="text-[10px] text-white/50 uppercase font-bold block">Security Standard</span>
            <span className="font-bungee text-sm text-pink-400">Dual OTP Handover</span>
          </div>
        </div>
      </div>

      {/* Drivers List */}
      {loading ? (
        <div className="text-center py-12 text-white/40 font-display text-sm">
          Loading delivery partners...
        </div>
      ) : drivers.length === 0 ? (
        <div className="admin-empty p-8 text-center glass rounded-2xl border border-white/10">
          <div className="text-4xl mb-2">🛵</div>
          <h3 className="font-bungee text-white">No delivery partners in portal</h3>
          <p className="text-xs text-white/50 mb-4">Click "Add Delivery Partner" to register your first courier.</p>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="btn-primary text-xs py-2 px-4"
          >
            Add Driver
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {drivers.map((driver) => (
            <div
              key={driver.id}
              className={`glass rounded-2xl p-5 border transition-all space-y-4 relative ${
                driver.is_active
                  ? 'border-cyan-500/30 bg-slate-900/60 shadow-lg shadow-cyan-500/5'
                  : 'border-white/10 bg-slate-950/40 opacity-70'
              }`}
            >
              {/* Driver Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <img
                    src={driver.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80'}
                    alt={driver.name}
                    className="w-12 h-12 rounded-xl object-cover border border-white/20 flex-shrink-0"
                  />
                  <div>
                    <h3 className="font-bungee text-sm text-white leading-tight">{driver.name}</h3>
                    <div className="flex items-center gap-1.5 text-xs text-white/60 mt-0.5">
                      <Star size={12} className="text-amber-400 fill-amber-400" />
                      <span className="font-bold text-amber-300">{driver.rating || '5.0'}</span>
                      <span className="text-[10px] text-white/40">({driver.deliveries_count || 0} deliveries)</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleToggleActive(driver)}
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase transition-all ${
                    driver.is_active
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-white/10 text-white/40 border border-white/10'
                  }`}
                >
                  {driver.is_active ? 'Active' : 'Inactive'}
                </button>
              </div>

              {/* Driver Details */}
              <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-1.5 text-xs">
                <div className="flex items-center justify-between text-white/80">
                  <span className="text-white/40">Vehicle:</span>
                  <span className="font-semibold text-cyan-300">{driver.vehicle_type}</span>
                </div>
                <div className="flex items-center justify-between text-white/80">
                  <span className="text-white/40">Plate No:</span>
                  <span className="font-mono font-bold text-white bg-white/5 px-1.5 py-0.5 rounded">
                    {driver.vehicle_number}
                  </span>
                </div>
                <div className="flex items-center justify-between text-white/80">
                  <span className="text-white/40">Hub / Area:</span>
                  <span className="text-white/80 flex items-center gap-1">
                    <MapPin size={10} className="text-pink-400" /> {driver.area}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-1 border-t border-white/10">
                <a
                  href={`tel:${driver.phone}`}
                  className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white text-xs font-display flex items-center gap-1.5 transition-all"
                >
                  <Phone size={12} className="text-emerald-400" />
                  <span>{driver.phone}</span>
                </a>
                <button
                  type="button"
                  onClick={() => handleDelete(driver)}
                  className="p-1.5 rounded-lg text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  title="Remove Driver"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Driver Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="glass relative w-full max-w-md rounded-3xl p-6 border border-cyan-500/30 shadow-2xl">
            <button
              onClick={() => setShowAddModal(false)}
              type="button"
              className="absolute top-5 right-5 p-2 rounded-xl text-white/50 hover:text-white hover:bg-white/10"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                <Truck size={20} />
              </div>
              <div>
                <h3 className="font-bungee text-lg text-white">Add Delivery Partner</h3>
                <p className="text-xs text-white/50">Register a new courier for order dispatch</p>
              </div>
            </div>

            <form onSubmit={handleAddDriver} className="space-y-4">
              <div>
                <label className="text-xs text-white/60 font-semibold block mb-1">Driver Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kumar"
                  className="input-dark text-xs"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>

              <div>
                <label className="text-xs text-white/60 font-semibold block mb-1">Phone Number</label>
                <input
                  type="tel"
                  required
                  placeholder="+91 98765 43210"
                  className="input-dark text-xs"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-white/60 font-semibold block mb-1">Vehicle Type</label>
                  <select
                    className="select-dark text-xs"
                    value={form.vehicle_type}
                    onChange={(e) => setForm({ ...form, vehicle_type: e.target.value })}
                  >
                    <option value="Electric Scooter (EV)">Electric Scooter (EV)</option>
                    <option value="Motorcycle / Bike">Motorcycle / Bike</option>
                    <option value="Delivery Van">Delivery Van</option>
                    <option value="Car / Sedan">Car / Sedan</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-white/60 font-semibold block mb-1">Vehicle Plate No</label>
                  <input
                    type="text"
                    required
                    placeholder="KA 01 AB 1234"
                    className="input-dark text-xs uppercase font-mono"
                    value={form.vehicle_number}
                    onChange={(e) => setForm({ ...form, vehicle_number: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-white/60 font-semibold block mb-1">Operating Hub / Area</label>
                <input
                  type="text"
                  placeholder="e.g. Koramangala Hub / South Bangalore"
                  className="input-dark text-xs"
                  value={form.area}
                  onChange={(e) => setForm({ ...form, area: e.target.value })}
                />
              </div>

              <div>
                <label className="text-xs text-white/60 font-semibold block mb-1">Avatar / Photo URL (Optional)</label>
                <input
                  type="url"
                  placeholder="https://..."
                  className="input-dark text-xs"
                  value={form.avatar}
                  onChange={(e) => setForm({ ...form, avatar: e.target.value })}
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-primary w-full py-3 text-xs font-bold"
                >
                  {saving ? 'Adding Partner...' : 'Save & Register Partner'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
