import { useState, useEffect } from 'react'
import {
  MessageSquare, Smartphone, Bell, Check, Send, AlertCircle,
  ExternalLink, Sparkles, Shield, RefreshCw, Save, Copy, CheckCheck
} from 'lucide-react'
import { useToast } from '../../contexts/ToastContext'
import {
  useWhatsAppSettings,
  buildWhatsAppLink,
  cleanPhoneNumber,
  sendWhatsAppNotification
} from '../../lib/whatsappSmsService'
import { SUPPORT_PHONE_TEL } from '../../lib/contact'
import { explainAdminError } from './adminHelpers'

export default function AdminWhatsApp() {
  const { showToast } = useToast()
  const { settings, save, loading } = useWhatsAppSettings()

  const [enabled, setEnabled] = useState(true)
  const [adminPhone, setAdminPhone] = useState('')
  const [notifyNewOrder, setNotifyNewOrder] = useState(true)
  const [notifyPayment, setNotifyPayment] = useState(true)
  const [notifyKyc, setNotifyKyc] = useState(false)
  const [webhookUrl, setWebhookUrl] = useState('')
  const [autoOpenTab, setAutoOpenTab] = useState(false)

  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)
  const [logs, setLogs] = useState([])

  // Load existing settings
  useEffect(() => {
    if (!loading && settings) {
      setEnabled(settings.enabled !== false)
      setAdminPhone(settings.admin_phone || SUPPORT_PHONE_TEL.replace(/\D/g, ''))
      setNotifyNewOrder(settings.notify_on_new_order !== false)
      setNotifyPayment(settings.notify_on_payment_verified !== false)
      setNotifyKyc(Boolean(settings.notify_on_kyc_submit))
      setWebhookUrl(settings.webhook_url || '')
      setAutoOpenTab(Boolean(settings.auto_open_tab))
    }
  }, [settings, loading])

  // Load audit logs from localStorage
  const refreshLogs = () => {
    try {
      const stored = JSON.parse(localStorage.getItem('localden_wa_logs') || '[]')
      setLogs(stored)
    } catch {
      setLogs([])
    }
  }

  useEffect(() => {
    refreshLogs()
  }, [])

  const handleSave = async (e) => {
    e?.preventDefault()
    const cleaned = cleanPhoneNumber(adminPhone)
    if (!cleaned || cleaned.length < 10) {
      showToast('Please enter a valid phone number (at least 10 digits).', 'error')
      return
    }

    setSaving(true)
    try {
      await save({
        enabled,
        admin_phone: cleaned,
        notify_on_new_order: notifyNewOrder,
        notify_on_payment_verified: notifyPayment,
        notify_on_kyc_submit: notifyKyc,
        webhook_url: webhookUrl.trim(),
        auto_open_tab: autoOpenTab,
      })
      showToast('WhatsApp notification settings saved!', 'success')
    } catch (err) {
      showToast(explainAdminError(err), 'error')
    } finally {
      setSaving(false)
    }
  }

  // Sample preview text
  const sampleMessage = `🚀 *NEW ORDER RECEIVED on LocalDen!* 🎮
━━━━━━━━━━━━━━━━━━━━━
📦 *Gear:* 🎮 PlayStation 5 Slim [GAMING]
👤 *Customer:* Rahul Sharma
📞 *Phone:* +91 98765 43210
📧 *Email:* rahul.sharma@example.com

📅 *Rental Period:* 2026-10-23 → 2026-10-26 (3 days)
💰 *Total Amount:* ₹2,499 (✅ PAID)
💳 *Payment Method:* Razorpay UPI
🚚 Home Delivery
📍 *Address:* Flat 402, Green Glen Layout, Bellandur, Bengaluru

━━━━━━━━━━━━━━━━━━━━━
🆔 *Order ID:* #ORD-84B2F1
⏰ *Time:* Today, 8:30 PM
👉 *Open Admin:* https://localden.online/admin`

  const handleTestNotification = async () => {
    const cleaned = cleanPhoneNumber(adminPhone)
    if (!cleaned) {
      showToast('Set an admin phone number first.', 'error')
      return
    }

    setTesting(true)
    const testMsg = `🔔 *LocalDen Test Notification* ⚡\n\nHey! Your WhatsApp notification system is working perfectly. You will receive real-time alerts whenever a customer places an order!\n\n🕒 ${new Date().toLocaleTimeString()}`

    try {
      const res = await sendWhatsAppNotification({
        phone: cleaned,
        message: testMsg,
        event: 'test_alert',
        payload: { webhook_url: webhookUrl.trim() },
      })

      refreshLogs()

      if (res.webhookSuccess) {
        showToast('Webhook fired & sent to WhatsApp successfully!', 'success')
      } else {
        // Open direct WhatsApp chat link
        window.open(res.waUrl, '_blank')
        showToast('Test link generated! Opening WhatsApp chat…', 'success')
      }
    } catch (err) {
      showToast(err.message || 'Test failed', 'error')
    } finally {
      setTesting(false)
    }
  }

  const handleCopySampleLink = () => {
    const link = buildWhatsAppLink(cleanPhoneNumber(adminPhone), sampleMessage)
    navigator.clipboard.writeText(link).then(() => {
      setCopiedLink(true)
      showToast('WhatsApp link copied to clipboard!', 'success')
      setTimeout(() => setCopiedLink(false), 2500)
    })
  }

  const clearLogs = () => {
    localStorage.removeItem('localden_wa_logs')
    setLogs([])
    showToast('Dispatch logs cleared', 'info')
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-950/60 via-green-900/30 to-black p-5 rounded-2xl border border-emerald-500/30 shadow-lg relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <MessageSquare size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white">WhatsApp Order Notification System</h2>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${enabled ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-red-500/20 text-red-300 border-red-500/40'}`}>
                  {enabled ? 'Active' : 'Disabled'}
                </span>
              </div>
              <p className="text-white/60 text-xs mt-1">
                Receive instant real-time WhatsApp alerts on your phone whenever a customer books gear on LocalDen.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleTestNotification}
              disabled={testing}
              className="px-3.5 py-2 rounded-xl bg-emerald-500 text-black font-bold text-xs hover:bg-emerald-400 transition-all flex items-center gap-1.5 shadow-md shadow-emerald-500/20 disabled:opacity-50"
            >
              {testing ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
              Test WhatsApp Alert
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/20 transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              <Save size={14} />
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Configuration Forms (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Main Controls Card */}
          <div className="glass p-5 rounded-2xl border border-white/10 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Smartphone size={16} className="text-emerald-400" />
              Admin Phone & Triggers
            </h3>

            {/* Enable/Disable Toggle */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/5">
              <div>
                <span className="text-xs font-semibold text-white block">WhatsApp Notifications Master Switch</span>
                <span className="text-[11px] text-white/50">Allow system to dispatch alerts on store activity</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
              </label>
            </div>

            {/* Admin WhatsApp Number */}
            <div>
              <label className="block text-xs font-semibold text-white/90 mb-1.5">
                Admin WhatsApp Number (Receives Order Alerts)
              </label>
              <div className="relative">
                <input
                  type="tel"
                  value={adminPhone}
                  onChange={(e) => setAdminPhone(e.target.value)}
                  placeholder="e.g. 919034695091 or 9034695091"
                  className="w-full px-3 py-2.5 rounded-xl bg-black/50 border border-white/15 text-white text-sm font-mono focus:border-emerald-500 focus:outline-none pl-10"
                />
                <Smartphone size={16} className="absolute left-3 top-3 text-white/40" />
              </div>
              <p className="text-[11px] text-white/50 mt-1">
                Enter your mobile number with country code (e.g. <strong className="text-emerald-300">919034695091</strong> for India). Default is store support number.
              </p>
            </div>

            {/* Notification Triggers Checkboxes */}
            <div className="pt-2 border-t border-white/10 space-y-2.5">
              <span className="text-xs font-semibold text-white/80 block">Event Triggers</span>

              <label className="flex items-center gap-2.5 cursor-pointer text-xs text-white/90 hover:text-white">
                <input
                  type="checkbox"
                  checked={notifyNewOrder}
                  onChange={(e) => setNotifyNewOrder(e.target.checked)}
                  className="rounded border-white/20 text-emerald-500 focus:ring-emerald-400 bg-black/40"
                />
                <span><strong>New Order Received:</strong> Instant alert when a customer books gear</span>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer text-xs text-white/90 hover:text-white">
                <input
                  type="checkbox"
                  checked={notifyPayment}
                  onChange={(e) => setNotifyPayment(e.target.checked)}
                  className="rounded border-white/20 text-emerald-500 focus:ring-emerald-400 bg-black/40"
                />
                <span><strong>Payment Verified:</strong> Alert when an order payment is marked paid</span>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer text-xs text-white/90 hover:text-white">
                <input
                  type="checkbox"
                  checked={notifyKyc}
                  onChange={(e) => setNotifyKyc(e.target.checked)}
                  className="rounded border-white/20 text-emerald-500 focus:ring-emerald-400 bg-black/40"
                />
                <span><strong>KYC Submitted:</strong> Alert when a customer uploads verification docs</span>
              </label>
            </div>
          </div>

          {/* Automated Webhook Gateway Card */}
          <div className="glass p-5 rounded-2xl border border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles size={16} className="text-cyan-400" />
                Automated Background Webhook (Optional)
              </h3>
              <span className="text-[10px] text-cyan-300 font-mono bg-cyan-500/10 border border-cyan-500/30 px-2 py-0.5 rounded">
                Hands-Free Dispatch
              </span>
            </div>

            <p className="text-xs text-white/70 leading-relaxed">
              To send messages <strong>silently in the background</strong> without opening WhatsApp manually, enter a webhook URL from <strong>Make.com</strong>, <strong>Zapier</strong>, <strong>n8n</strong>, <strong>Twilio WhatsApp</strong>, or your custom WhatsApp API.
            </p>

            <div>
              <label className="block text-xs font-semibold text-white/90 mb-1.5">
                Webhook URL
              </label>
              <input
                type="url"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://hook.eu2.make.com/your-webhook-id or https://api.twilio.com/..."
                className="w-full px-3 py-2.5 rounded-xl bg-black/50 border border-white/15 text-white text-xs font-mono focus:border-cyan-500 focus:outline-none"
              />
              <p className="text-[11px] text-white/50 mt-1">
                When an order is created, LocalDen POSTs JSON: <code className="text-cyan-300">{`{ event, recipient_phone, message, data }`}</code>
              </p>
            </div>

            {/* Quick 2-Min Setup Guide */}
            <div className="p-3.5 rounded-xl bg-cyan-950/30 border border-cyan-500/20 text-xs space-y-2">
              <span className="font-bold text-cyan-300 block">💡 Free 2-Minute Setup with Make.com / Zapier:</span>
              <ol className="list-decimal list-inside space-y-1 text-white/70 text-[11px]">
                <li>Create a free account on <strong>Make.com</strong> or <strong>Zapier</strong>.</li>
                <li>Add a <strong>"Custom Webhook"</strong> trigger and paste the generated URL above.</li>
                <li>Add a <strong>"WhatsApp Business Cloud"</strong> or <strong>"Twilio SMS/WhatsApp"</strong> action to send <code className="text-cyan-300">message</code> to <code className="text-cyan-300">recipient_phone</code>.</li>
                <li>Save & turn ON — every order now automatically pings your phone!</li>
              </ol>
            </div>
          </div>
        </div>

        {/* Right Column: Live WhatsApp Phone Mockup & Dispatch Logs (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          {/* Phone Mockup Preview */}
          <div className="glass p-5 rounded-2xl border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <MessageSquare size={16} className="text-emerald-400" />
                Live Message Preview
              </h3>
              <button
                type="button"
                onClick={handleCopySampleLink}
                className="text-[11px] text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1"
                title="Copy sample WhatsApp link"
              >
                {copiedLink ? <Check size={12} /> : <Copy size={12} />}
                {copiedLink ? 'Copied Link!' : 'Copy Link'}
              </button>
            </div>

            {/* WhatsApp Chat Bubble Mockup */}
            <div className="bg-[#0b141a] p-3 rounded-2xl border border-emerald-900/40 shadow-inner">
              {/* Chat Header */}
              <div className="flex items-center gap-2 pb-2.5 mb-2.5 border-b border-white/10">
                <div className="w-7 h-7 rounded-full bg-emerald-600 flex items-center justify-center text-white text-xs font-bold">
                  LD
                </div>
                <div>
                  <span className="text-xs font-bold text-white block">LocalDen Dispatch</span>
                  <span className="text-[10px] text-emerald-400">Online · Store Bot</span>
                </div>
              </div>

              {/* Message Bubble */}
              <div className="bg-[#005c4b] text-white p-3 rounded-xl rounded-tl-none text-[11px] leading-relaxed shadow space-y-1 font-sans select-all whitespace-pre-wrap">
                {sampleMessage}
                <div className="flex items-center justify-end gap-1 text-[9px] text-white/60 pt-1">
                  <span>Just now</span>
                  <CheckCheck size={12} className="text-cyan-400 inline" />
                </div>
              </div>
            </div>

            <p className="text-[11px] text-white/50 text-center">
              Message automatically pulls live gear title, renter details, delivery address, and total amount.
            </p>
          </div>

          {/* Recent Dispatch Logs */}
          <div className="glass p-5 rounded-2xl border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Bell size={16} className="text-amber-400" />
                Recent Dispatches
              </h3>
              {logs.length > 0 && (
                <button
                  type="button"
                  onClick={clearLogs}
                  className="text-[10px] text-white/40 hover:text-red-400"
                >
                  Clear Logs
                </button>
              )}
            </div>

            {logs.length === 0 ? (
              <div className="text-center py-6 text-white/40 text-xs">
                No notifications logged yet. Place a test alert to see history.
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 text-xs flex items-start justify-between gap-2"
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-white font-mono text-[11px]">+{log.phone}</span>
                        <span className="text-[9px] uppercase font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          {log.event}
                        </span>
                      </div>
                      <p className="text-[10px] text-white/60 truncate max-w-[200px] mt-0.5">
                        {log.messagePreview}…
                      </p>
                      <span className="text-[9px] text-white/40 block mt-0.5">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      {log.webhookSuccess ? (
                        <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-0.5">
                          ✓ Sent
                        </span>
                      ) : (
                        <a
                          href={buildWhatsAppLink(log.phone, log.messagePreview)}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] hover:bg-emerald-500/30 font-semibold flex items-center gap-1"
                        >
                          <Send size={10} /> Send
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
