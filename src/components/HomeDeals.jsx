import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Sparkles, Tag, Check, Calendar, ArrowRight, Gift, Zap } from 'lucide-react'
import { useToast } from '../contexts/ToastContext'
import { useDiscountCampaigns } from '../lib/discountCampaignService'
import './homeDeals.css'

export default function HomeDeals() {
  const { showToast } = useToast()
  const { settings, loading } = useDiscountCampaigns()
  const [copiedCode, setCopiedCode] = useState(null)

  const copy = async (code) => {
    if (!code) return
    try {
      await navigator.clipboard.writeText(code)
      setCopiedCode(code)
      showToast(`Promo code "${code}" copied to clipboard!`, 'success')
      setTimeout(() => setCopiedCode(null), 2500)
    } catch {
      showToast(`Code: ${code}`, 'info')
    }
  }

  if (loading) return null

  const camp = settings?.active_campaign
  const duration = settings?.duration_discounts

  return (
    <section className="home-section home-deals" aria-label="Active discounts and offers">
      <div className="home-deals__head">
        <p className="section-label mb-2 flex items-center justify-center gap-1.5">
          <Sparkles size={14} className="text-[#ff2e6d]" /> Special Offers &amp; Savings
        </p>
        <h2 className="home-deals__title">
          Live <span className="gradient-text">Discounts &amp; Deals</span>
        </h2>
        <p className="font-display text-sm mt-2 text-white/50">
          Save on gaming consoles, VR, guitars, and DJ controllers with active codes &amp; multi-day rates.
        </p>
      </div>

      <div className="home-deals__grid">
        {/* Card 1: Active Flash Sale Campaign */}
        {camp?.enabled && (
          <div className="deal-card deal-card--featured animate-fade-in">
            <div>
              <span className="deal-card__badge deal-card__badge--pink">
                <Zap size={11} /> {camp.badge || 'FLASH DEAL'}
              </span>

              <h3 className="deal-card__heading">
                {camp.title}
              </h3>

              <p className="deal-card__desc">
                {camp.description || `Get ${camp.discount_percent}% off on your next gear booking!`}
              </p>

              <div className="deal-code-box">
                <div>
                  <span className="text-[10px] text-white/40 uppercase block font-semibold">Promo Code</span>
                  <code>{camp.code}</code>
                </div>
                <button
                  type="button"
                  onClick={() => copy(camp.code)}
                  className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1"
                >
                  {copiedCode === camp.code ? (
                    <>
                      <Check size={13} className="text-emerald-300" /> Copied!
                    </>
                  ) : (
                    <>
                      <Tag size={13} /> Copy Code
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs text-white/60">
              <span>{camp.discount_percent}% OFF {camp.min_subtotal ? `· Min ₹${camp.min_subtotal}` : ''}</span>
              <Link to="/browse" className="text-pink-400 hover:text-pink-300 font-semibold inline-flex items-center gap-1">
                Browse Gear <ArrowRight size={12} />
              </Link>
            </div>
          </div>
        )}

        {/* Card 2: Duration-Based Multi-Day Discounts */}
        {duration?.enabled && (
          <div className="deal-card animate-fade-in">
            <div>
              <span className="deal-card__badge deal-card__badge--cyan">
                <Calendar size={11} /> RENT LONGER, SAVE MORE
              </span>

              <h3 className="deal-card__heading">
                Multi-Day Rental Savings
              </h3>

              <p className="deal-card__desc">
                Keep the party or marathon going! Automatic tiered discounts apply as you add more days at checkout.
              </p>

              <div className="deal-tiers">
                {(duration.tiers || []).map((tier) => (
                  <div key={tier.days} className="deal-tier-item">
                    <span>{tier.label || `${tier.days}+ Days`}</span>
                    <strong>{tier.discount_percent}% OFF</strong>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs text-white/60">
              <span className="text-emerald-400 font-semibold">Auto-applied in cart</span>
              <Link to="/browse" className="text-cyan-400 hover:text-cyan-300 font-semibold inline-flex items-center gap-1">
                Pick Dates <ArrowRight size={12} />
              </Link>
            </div>
          </div>
        )}

        {/* Card 3: New Member Onboarding Pack */}
        <div className="deal-card animate-fade-in">
          <div>
            <span className="deal-card__badge deal-card__badge--green">
              <Gift size={11} /> NEW MEMBER PERKS
            </span>

            <h3 className="deal-card__heading">
              Welcome Coupon + Wallet Cash
            </h3>

            <p className="deal-card__desc">
              Create a free account in 30 seconds. Get an automatic welcome discount coupon plus ₹100 LocalDen wallet bonus!
            </p>

            <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-2 mb-4 text-xs">
              <div className="flex items-center justify-between text-white/80">
                <span>🎁 50% Welcome Coupon:</span>
                <strong className="text-pink-400 font-mono">Auto on Signup</strong>
              </div>
              <div className="flex items-center justify-between text-white/80">
                <span>💰 Welcome Den Cash:</span>
                <strong className="text-emerald-400 font-mono">+₹100 in Wallet</strong>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs text-white/60">
            <span>Free signup · Zero membership fees</span>
            <Link to="/signup" className="text-emerald-400 hover:text-emerald-300 font-semibold inline-flex items-center gap-1">
              Join Free <ArrowRight size={12} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
