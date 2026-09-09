import { Link } from 'react-router-dom'
import { Shield, Star, Zap, Lock, CreditCard, Phone, CheckCircle, ArrowRight } from 'lucide-react'
import GameBackground from '../components/GameBackground'

function BigStep({ num, emoji, title, desc, color, forRole }) {
  return (
    <div className="glass rounded-2xl p-8 card-hover">
      <div className="flex items-start gap-5">
        <div className="flex-shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-display font-bold"
          style={{ background: `${color}20`, border: `1px solid ${color}30`, color }}>
          {num}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">{emoji}</span>
            <h3 className="font-display font-bold text-xl text-white">{title}</h3>
          </div>
          <p className="text-sm leading-relaxed mb-3" style={{ color: 'rgba(255,255,255,0.55)' }}>{desc}</p>
          <span className="text-xs px-2 py-1 rounded-full"
            style={{
              background: forRole === 'renter' ? 'rgba(6,182,212,0.1)' : 'rgba(168,85,247,0.1)',
              border: `1px solid ${forRole === 'renter' ? 'rgba(6,182,212,0.25)' : 'rgba(168,85,247,0.25)'}`,
              color: forRole === 'renter' ? '#06b6d4' : '#a855f7',
            }}>
            For {forRole === 'renter' ? 'Renters' : 'Listers'}
          </span>
        </div>
      </div>
    </div>
  )
}

export default function HowItWorks() {
  return (
    <div className="relative min-h-screen pt-24 pb-20">
      <GameBackground />

      <div className="relative z-10 max-w-4xl mx-auto px-4">

        {/* ── Header ──────────────────────────────── */}
        <div className="text-center mb-16">
          <p className="section-label mb-3">Simple & Safe</p>
          <h1 className="font-display font-bold text-5xl text-white mb-4">
            How It <span className="gradient-text">Works</span>
          </h1>
          <p className="text-lg max-w-xl mx-auto" style={{ color: 'rgba(255,255,255,0.5)' }}>
            RentYourSystem is a peer-to-peer marketplace that connects gear owners with people who want to rent — safely, easily, and affordably in Bangalore.
          </p>
        </div>

        {/* ── FOR RENTERS ─────────────────────────── */}
        <div className="mb-14">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm"
              style={{ background: 'rgba(6,182,212,0.15)', border: '1px solid rgba(6,182,212,0.3)', color: '#06b6d4' }}>
              🎮
            </div>
            <h2 className="font-display font-bold text-2xl text-white">For Renters</h2>
          </div>
          <div className="space-y-4">
            <BigStep num="01" emoji="🔍" color="#06b6d4" forRole="renter" title="Browse & Search"
              desc="Filter by category (Gaming or Music), location in Bangalore, price range, and availability dates. Find exactly what you need." />
            <BigStep num="02" emoji="📅" color="#a855f7" forRole="renter" title="Book & Pay Securely"
              desc="Select your dates and pay online via UPI, card, or EMI. Your money is held in escrow — released to the lister only after safe delivery." />
            <BigStep num="03" emoji="✅" color="#ec4899" forRole="renter" title="KYC Verification"
              desc="First-time renters complete a quick Aadhaar/PAN verification. Takes 2 minutes. Gives listers the confidence to share their gear." />
            <BigStep num="04" emoji="🚚" color="#eab308" forRole="renter" title="Receive & Play"
              desc="Arrange pickup or get home delivery (+₹99). Both sides upload before-photos. Enjoy your rental. Return on time, deposit refunded instantly." />
            <BigStep num="05" emoji="⭐" color="#22c55e" forRole="renter" title="Rate & Repeat"
              desc="Leave an honest review. Build your renter reputation for better future deals. The more rentals, the more trust you earn." />
          </div>
        </div>

        {/* ── FOR LISTERS ─────────────────────────── */}
        <div className="mb-14">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm"
              style={{ background: 'rgba(168,85,247,0.15)', border: '1px solid rgba(168,85,247,0.3)', color: '#a855f7' }}>
              💰
            </div>
            <h2 className="font-display font-bold text-2xl text-white">For Listers</h2>
          </div>
          <div className="space-y-4">
            <BigStep num="01" emoji="📝" color="#a855f7" forRole="lister" title="Create Your Listing"
              desc="Add photos, set your price per day/weekend/week, choose your area in Bangalore, and set availability. Takes under 5 minutes." />
            <BigStep num="02" emoji="🔐" color="#06b6d4" forRole="lister" title="We Verify Renters"
              desc="Every renter is KYC-verified before their first booking. You can see their rental history and ratings before accepting." />
            <BigStep num="03" emoji="💳" color="#ec4899" forRole="lister" title="Accept Bookings"
              desc="Get a notification, review the renter's profile, and accept or decline. Deposit is collected upfront — your item is protected." />
            <BigStep num="04" emoji="🤝" color="#eab308" forRole="lister" title="Hand Over & Earn"
              desc="Meet the renter or arrange delivery. Take before-photos together. Relax while they enjoy your gear." />
            <BigStep num="05" emoji="💸" color="#22c55e" forRole="lister" title="Get Paid"
              desc="You receive 80% of the rental price within 24 hours of the renter confirming safe return. Direct UPI or bank transfer." />
          </div>
        </div>

        {/* ── Trust & Safety ──────────────────────── */}
        <div className="mb-14">
          <h2 className="font-display font-bold text-2xl text-white mb-6 text-center">Trust &amp; Safety</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              { icon: <Shield size={20} />, color: '#22c55e', title: 'Security Deposit',
                desc: '₹5,000–₹15,000 held by platform during rental. Released only after safe return.' },
              { icon: <Lock size={20} />, color: '#a855f7', title: 'Escrow Payments',
                desc: 'Money never goes directly to lister until rental is complete and confirmed.' },
              { icon: <CreditCard size={20} />, color: '#06b6d4', title: 'KYC Verification',
                desc: 'Aadhaar/PAN verified renters only. No anonymous rentals allowed.' },
              { icon: <Star size={20} />, color: '#eab308', title: 'Review System',
                desc: 'Two-way reviews after every rental. Bad actors are removed automatically.' },
              { icon: <Zap size={20} />, color: '#ec4899', title: 'Damage Insurance',
                desc: 'Optional ₹99/day add-on covers accidental damage up to ₹30,000.' },
              { icon: <Phone size={20} />, color: '#a855f7', title: '24h Support',
                desc: 'Dispute? Contact us within 24h of return. We resolve fairly for both sides.' },
            ].map(f => (
              <div key={f.title} className="glass rounded-2xl p-5 card-hover flex gap-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `${f.color}15`, border: `1px solid ${f.color}25`, color: f.color }}>
                  {f.icon}
                </div>
                <div>
                  <h4 className="font-semibold text-white mb-1 text-sm">{f.title}</h4>
                  <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.5)' }}>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── FAQ ─────────────────────────────────── */}
        <div className="mb-14">
          <h2 className="font-display font-bold text-2xl text-white mb-6 text-center">FAQ</h2>
          <div className="space-y-3">
            {[
              { q: 'What if the item gets damaged?', a: 'The security deposit covers minor damage. For major damage, the optional insurance covers up to ₹30,000. We mediate all disputes fairly.' },
              { q: 'How long does KYC take?', a: 'Usually under 2 minutes. Upload a photo of your Aadhaar/PAN and a selfie. Approved automatically or manually within 1 hour.' },
              { q: 'Can I list multiple items?', a: 'Absolutely! Many listers have 3–5 items. Each has its own listing, calendar, and pricing. No listing fees.' },
              { q: 'How is the rental commission calculated?', a: 'You keep 80% of every booking. The 20% platform fee covers payment processing, insurance, marketing, and support.' },
              { q: 'What areas in Bangalore are supported?', a: 'Currently: Koramangala, Indiranagar, HSR Layout, Whitefield, BTM Layout, Marathahalli, Electronic City, Jayanagar, Sadashivanagar, Malleshwaram, Hebbal. Expanding soon.' },
            ].map((f, i) => (
              <details key={i} className="glass rounded-2xl group" style={{ cursor: 'pointer' }}>
                <summary className="flex items-center justify-between p-5 font-medium text-white list-none">
                  <span className="flex items-center gap-2">
                    <CheckCircle size={14} className="text-purple-400 flex-shrink-0" /> {f.q}
                  </span>
                  <ArrowRight size={14} className="transition-transform group-open:rotate-90 flex-shrink-0" style={{ color: 'rgba(255,255,255,0.4)' }} />
                </summary>
                <p className="px-5 pb-5 text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>{f.a}</p>
              </details>
            ))}
          </div>
        </div>

        {/* ── Final CTA ───────────────────────────── */}
        <div className="text-center glass rounded-3xl p-10">
          <p className="text-4xl mb-4">🚀</p>
          <h3 className="font-display font-bold text-3xl text-white mb-3">Ready to Get Started?</h3>
          <p className="mb-8" style={{ color: 'rgba(255,255,255,0.5)' }}>
            Join Bangalore's growing community of gamers and musicians.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/browse" className="btn-primary px-8 py-3">Browse Gear</Link>
            <Link to="/list-item" className="btn-secondary px-8 py-3">List Your Item</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
