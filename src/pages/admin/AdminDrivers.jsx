import { useEffect, useState } from 'react'
import { Truck, Plus, Phone, Star, CheckCircle, XCircle, Trash2, Edit2, Shield, MapPin, X, Building2, Save, Printer, Navigation } from 'lucide-react'
import { useToast } from '../../contexts/ToastContext'
import { useConfirm } from '../../contexts/ConfirmContext'
import { useDeliveryPartners } from '../../hooks/useDeliveryPartners'
import {
  addDeliveryPartner,
  updateDeliveryPartner,
  deleteDeliveryPartner,
} from '../../lib/driverService'
import {
  fetchWarehouseSettings,
  saveWarehouseSettings,
  DEFAULT_WAREHOUSE_SETTINGS,
} from '../../lib/deliveryFee'

export default function AdminDrivers() {
  const { showToast } = useToast()
  const { confirm } = useConfirm()
  const { drivers, loading, reload: loadDrivers } = useDeliveryPartners()
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
    const ok = await confirm({
      title: 'Remove Delivery Partner',
      message: `Are you sure you want to remove ${driver.name} from delivery partners? This cannot be undone.`,
      confirmText: 'Yes, Remove Driver',
      variant: 'danger',
    })
    if (!ok) return
    try {
      await deleteDeliveryPartner(driver.id)
      await loadDrivers?.()
      showToast(`Driver ${driver.name} removed`, 'success')
    } catch (err) {
      showToast(err.message || 'Failed to remove driver', 'error')
    }
  }

  const [activeSubTab, setActiveSubTab] = useState('warehouse') // 'warehouse' or 'drivers'
  const [warehouseForm, setWarehouseForm] = useState(DEFAULT_WAREHOUSE_SETTINGS)
  const [savingWarehouse, setSavingWarehouse] = useState(false)

  useEffect(() => {
    fetchWarehouseSettings().then((res) => {
      if (res) setWarehouseForm(res)
    })
  }, [])

  const handleSaveWarehouse = async (e) => {
    e.preventDefault()
    setSavingWarehouse(true)
    try {
      await saveWarehouseSettings(warehouseForm)
      showToast('🏢 Warehouse location & delivery charge settings saved!', 'success')
    } catch (err) {
      showToast(err.message || 'Failed to save warehouse settings.', 'error')
    } finally {
      setSavingWarehouse(false)
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
        {activeSubTab === 'drivers' && (
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="btn-primary flex items-center gap-2 text-xs py-2.5 px-4 font-bold self-start sm:self-auto"
          >
            <Plus size={16} /> Add Delivery Partner
          </button>
        )}
      </div>

      {/* Sub Tabs: Warehouse & Distance Settings VS Active Couriers */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-3">
        <button
          type="button"
          onClick={() => setActiveSubTab('warehouse')}
          className={`px-4 py-2 rounded-xl text-xs font-bungee flex items-center gap-2 transition-all ${
            activeSubTab === 'warehouse'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 shadow-lg shadow-cyan-500/10'
              : 'text-white/60 hover:text-white hover:bg-white/5'
          }`}
        >
          <Building2 size={14} /> Warehouse Hub &amp; Delivery Pricing
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('drivers')}
          className={`px-4 py-2 rounded-xl text-xs font-bungee flex items-center gap-2 transition-all ${
            activeSubTab === 'drivers'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 shadow-lg shadow-cyan-500/10'
              : 'text-white/60 hover:text-white hover:bg-white/5'
          }`}
        >
          <Truck size={14} /> Couriers &amp; Drivers ({drivers.length})
        </button>
      </div>

      {activeSubTab === 'warehouse' ? (
        /* WAREHOUSE LOCATION & DISTANCE DELIVERY FORM */
        <div className="admin-card p-6 rounded-2xl bg-white/[0.03] border border-white/10 space-y-6">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <span className="text-[11px] font-bungee uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
                <Building2 size={15} /> Central Warehouse &amp; Hub Dispatch Location
              </span>
              <p className="text-xs text-white/60 mt-0.5">
                Doorstep delivery fees for buyers are calculated dynamically based on driving distance from this warehouse hub.
              </p>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 font-mono text-xs text-cyan-300">
              ⚡ Live Auto-Calculator Active
            </div>
          </div>

          <form onSubmit={handleSaveWarehouse} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-white/70 font-bold block mb-1">Warehouse Hub Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. LocalDen Koramangala Hub"
                  className="input-dark text-xs"
                  value={warehouseForm.warehouse_name || ''}
                  onChange={(e) => setWarehouseForm({ ...warehouseForm, warehouse_name: e.target.value })}
                />
              </div>

              <div>
                <label className="text-xs text-white/70 font-bold block mb-1">Warehouse Physical Address</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 4th Block, Koramangala, Bengaluru, Karnataka 560034"
                  className="input-dark text-xs"
                  value={warehouseForm.warehouse_address || ''}
                  onChange={(e) => setWarehouseForm({ ...warehouseForm, warehouse_address: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="text-xs text-white/70 font-bold block mb-1">Warehouse Latitude</label>
                <input
                  type="number"
                  step="0.0001"
                  required
                  placeholder="12.9352"
                  className="input-dark text-xs font-mono"
                  value={warehouseForm.warehouse_lat || ''}
                  onChange={(e) => setWarehouseForm({ ...warehouseForm, warehouse_lat: parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div>
                <label className="text-xs text-white/70 font-bold block mb-1">Warehouse Longitude</label>
                <input
                  type="number"
                  step="0.0001"
                  required
                  placeholder="77.6245"
                  className="input-dark text-xs font-mono"
                  value={warehouseForm.warehouse_lng || ''}
                  onChange={(e) => setWarehouseForm({ ...warehouseForm, warehouse_lng: parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div>
                <label className="text-xs text-white/70 font-bold block mb-1">Base Delivery Fee (₹)</label>
                <input
                  type="number"
                  min="0"
                  required
                  placeholder="99"
                  className="input-dark text-xs font-mono"
                  value={warehouseForm.base_fee ?? ''}
                  onChange={(e) => setWarehouseForm({ ...warehouseForm, base_fee: Number(e.target.value) })}
                />
                <span className="text-[10px] text-white/40 block mt-0.5">Fixed rate for near orders</span>
              </div>

              <div>
                <label className="text-xs text-white/70 font-bold block mb-1">Base Km Included</label>
                <input
                  type="number"
                  min="0"
                  required
                  placeholder="3"
                  className="input-dark text-xs font-mono"
                  value={warehouseForm.base_km_included ?? ''}
                  onChange={(e) => setWarehouseForm({ ...warehouseForm, base_km_included: Number(e.target.value) })}
                />
                <span className="text-[10px] text-white/40 block mt-0.5">Covered in base fee</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-white/70 font-bold block mb-1">Rate per Extra Km (₹/km)</label>
                <input
                  type="number"
                  min="0"
                  required
                  placeholder="15"
                  className="input-dark text-xs font-mono"
                  value={warehouseForm.per_km_rate ?? ''}
                  onChange={(e) => setWarehouseForm({ ...warehouseForm, per_km_rate: Number(e.target.value) })}
                />
                <span className="text-[10px] text-white/40 block mt-0.5">Charged for km beyond base</span>
              </div>

              <div>
                <label className="text-xs text-white/70 font-bold block mb-1">Max Cap Fee (₹)</label>
                <input
                  type="number"
                  min="0"
                  required
                  placeholder="499"
                  className="input-dark text-xs font-mono"
                  value={warehouseForm.max_fee ?? ''}
                  onChange={(e) => setWarehouseForm({ ...warehouseForm, max_fee: Number(e.target.value) })}
                />
                <span className="text-[10px] text-white/40 block mt-0.5">Maximum possible delivery charge</span>
              </div>

              <div>
                <label className="text-xs text-white/70 font-bold block mb-1">Free Delivery Above (₹)</label>
                <input
                  type="number"
                  min="0"
                  placeholder="3500 (0 to disable)"
                  className="input-dark text-xs font-mono"
                  value={warehouseForm.free_delivery_above ?? ''}
                  onChange={(e) => setWarehouseForm({ ...warehouseForm, free_delivery_above: Number(e.target.value) })}
                />
                <span className="text-[10px] text-white/40 block mt-0.5">0 = no free delivery threshold</span>
              </div>
            </div>

            <div>
              <label className="text-xs text-white/70 font-bold block mb-1 flex items-center gap-1.5">
                <Printer size={13} className="text-cyan-400" /> Warehouse Print Note / Dispatch Slip Note
              </label>
              <textarea
                rows={2}
                placeholder="Dispatched from Koramangala Hub · Verified & Sanitized with Anti-Static Packaging · Tested Before Dispatch"
                className="input-dark text-xs"
                value={warehouseForm.print_note || ''}
                onChange={(e) => setWarehouseForm({ ...warehouseForm, print_note: e.target.value })}
              />
              <span className="text-[10px] text-white/40 block mt-1">
                Printed on customer invoice, delivery tracking slip, and included in WhatsApp dispatch notifications.
              </span>
            </div>

            {/* Live Pricing Preview Simulation */}
            <div className="p-3.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-xs space-y-1">
              <span className="font-bold text-cyan-300">💡 Formula Preview:</span>
              <p className="text-white/80">
                A delivery destination <strong>8.0 km</strong> away will cost:{' '}
                <strong className="text-cyan-300">
                  ₹{warehouseForm.base_fee} (first {warehouseForm.base_km_included} km) + {Math.max(0, 8 - (warehouseForm.base_km_included || 0))} km × ₹{warehouseForm.per_km_rate} = ₹
                  {Math.min(
                    warehouseForm.max_fee || 999,
                    (warehouseForm.base_fee || 0) + Math.max(0, 8 - (warehouseForm.base_km_included || 0)) * (warehouseForm.per_km_rate || 0)
                  )}
                </strong>
              </p>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={savingWarehouse}
                className="btn-primary py-2.5 px-6 text-xs font-bold flex items-center gap-1.5"
              >
                <Save size={14} /> {savingWarehouse ? 'Saving Settings...' : 'Save Warehouse & Delivery Settings'}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <>
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
    </>
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
                  placeholder="e.g. Koramangala Hub / Cyber City, Gurugram"
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
