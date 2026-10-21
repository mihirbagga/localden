import { Link } from 'react-router-dom'
import { ShieldCheck, HeartHandshake, Lock, Camera, KeyRound, CheckCircle2, AlertTriangle } from 'lucide-react'
import GameBackground from '../components/GameBackground'
import { SUPPORT_EMAIL, SUPPORT_PHONE } from '../lib/contact'
import './terms.css'

export default function Terms() {
  return (
    <div className="terms-page">
      <div className="grid-floor" />
      <GameBackground />
      <article className="terms-wrap">
        <header className="terms-head">
          <p className="section-label mb-3">Trust · Care · Protection</p>
          <h1 className="terms-title">Lender Protection &amp; Borrower Care Policy</h1>
          <p className="terms-lead">
            Built so Lenders list high-value gear with 100% peace of mind, and Borrowers treat every console, VR headset, guitar, and DJ deck like their own.
          </p>
        </header>

        <nav className="terms-nav" aria-label="Policy sections">
          <a href="#lender-shield">🛡️ Lender Protection</a>
          <a href="#care-charter">🤝 Borrower Care Rules</a>
          <a href="#damage">⚖️ Damage Matrix</a>
          <a href="#accessory-tariff">🔌 Accessory Tariff</a>
          <a href="#deposit">💰 Deposit Escrow</a>
          <a href="#disputes">🚨 Disputes &amp; FIR</a>
        </nav>

        {/* 1. 5-LAYER LENDER PROTECTION SHIELD */}
        <section className="terms-block border-cyan-500/35" id="lender-shield">
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck size={20} className="text-cyan-400 shrink-0" />
            <h2 className="!mb-0">1. The 5-Layer Lender Protection Guarantee</h2>
          </div>
          <p>
            When you list your console, controller, VR headset, guitar, or DJ rig on लोकल Den, your hardware is protected by five mandatory security layers on every single booking:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 my-3">
            <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/25">
              <strong className="text-cyan-300 text-xs uppercase tracking-wider block mb-1">
                1. Mandatory Govt KYC + Selfie
              </strong>
              <p className="!text-xs !mb-0">
                Every borrower must pass Aadhaar/PAN ID verification, live phone check, and residential address verification before reserving high-value gear.
              </p>
            </div>
            <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/25">
              <strong className="text-purple-300 text-xs uppercase tracking-wider block mb-1">
                2. E-Signed Legal Rental Pact
              </strong>
              <p className="!text-xs !mb-0">
                Both Lender and Borrower digitally sign a timestamped Rental Agreement (valid under the Indian Contract Act &amp; IT Act 2000) locking in serials, dates, and liability.
              </p>
            </div>
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25">
              <strong className="text-emerald-300 text-xs uppercase tracking-wider block mb-1">
                3. Dual-OTP + 3-Point Handover
              </strong>
              <p className="!text-xs !mb-0">
                Gear never leaves your hands without matching the 4-digit Handover PIN and verifying cables, controllers, and exterior condition.
              </p>
            </div>
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25">
              <strong className="text-amber-300 text-xs uppercase tracking-wider block mb-1">
                4. Check-In / Check-Out Photo Proof
              </strong>
              <p className="!text-xs !mb-0">
                Timestamped photos at pickup and return eliminate &ldquo;it was already scratched&rdquo; arguments and guarantee fast claim resolution.
              </p>
            </div>
          </div>
          <ul>
            <li><strong>5. Anti-Tamper &amp; Zero Sub-Renting Rule:</strong> Borrowers are strictly prohibited from opening hardware shells, removing warranty/serial stickers, jailbreaking consoles, or lending gear to third parties.</li>
            <li><strong>100% Fair Market Recovery:</strong> If an item is damaged beyond repair, lost, or unreturned after 48 hours, LocalDen applies the security deposit immediately, locks the borrower&apos;s account, and provides full KYC dossier &amp; legal/police FIR support to recover full replacement value.</li>
          </ul>
        </section>

        {/* 2. BORROWER CARE CHARTER ("TREAT IT LIKE YOUR OWN") */}
        <section className="terms-block border-emerald-500/35" id="care-charter">
          <div className="flex items-center gap-2 mb-2">
            <HeartHandshake size={20} className="text-emerald-400 shrink-0" />
            <h2 className="!mb-0">2. Borrower Care Charter — &ldquo;Treat It Like Your Own&rdquo;</h2>
          </div>
          <p>
            Great gear exists on लोकल Den because real gamers and musicians trust the community with their prized setups. When you rent, you pledge to follow these 6 Golden Care Rules:
          </p>
          <ul>
            <li><strong>🌬️ Keep Consoles Cool &amp; Ventilated:</strong> Place PS5, Xbox, or amps on a flat, hard, open surface with at least 6 inches of airflow clearance. <strong>Never</strong> place consoles on beds, thick carpets, pillows, or inside closed cabinets.</li>
            <li><strong>🥤 No Liquids, Food, or Smoke Near Gear:</strong> Keep drinks, curries, hookahs, cigarettes, and pets strictly away from controllers, DJ decks, keyboards, and VR headsets. Sticky buttons or liquid spills count as deductible damage.</li>
            <li><strong>⚡ Use Surge-Protected Power &amp; Safe Unplugging:</strong> Shut down consoles properly from the OS menu before unplugging power. Pull HDMI and guitar cables by the connector plug—never yank the cord.</li>
            <li><strong>🎮 Gentle on Thumbsticks, Triggers &amp; Strings:</strong> Play hard, but don&apos;t slam controllers, drop headsets, or over-tighten guitar tuning pegs. VR lenses must never be exposed to direct sunlight.</li>
            <li><strong>🔒 Never Tamper with Seals or Accounts:</strong> Do not peel off serial/warranty stickers, open hardware screws, or delete/modify the lender&apos;s primary console profiles without permission.</li>
            <li><strong>🎒 Pack Everything Neat &amp; Clean on Return:</strong> Wipe down controllers/headsets with a dry microfiber cloth, coil HDMI &amp; power cables neatly without kinks, and return every single accessory in the original bag/box on time.</li>
          </ul>
        </section>

        {/* 3. DAMAGE MATRIX */}
        <section className="terms-block" id="damage">
          <h2>3. Who Pays for What (Fair Damage Matrix)</h2>
          <p>You are responsible for the gear from Handover PIN verification until Return PIN verification. We use clear, objective rules so neither Borrower nor Lender is ever treated unfairly:</p>
          <table className="terms-table">
            <thead>
              <tr>
                <th>Scenario / Condition</th>
                <th>How It Is Handled</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Normal wear &amp; tear:</strong> Light micro-scuffs, fingerprints, normal pad wear, dusty fan vents</td>
                <td><strong className="text-emerald-400">₹0 charged.</strong> 100% of security deposit returns in full.</td>
              </tr>
              <tr>
                <td><strong>Missing or damaged cable/accessory:</strong> Lost HDMI 2.1 cord, power cable, USB-C cable, guitar strap/cable</td>
                <td>Fixed replacement cost from the <strong>Standard Accessory Tariff</strong> below (deducted from deposit).</td>
              </tr>
              <tr>
                <td><strong>Minor / repairable hardware damage:</strong> Broken controller trigger, stick drift from drop, snapped guitar string, cracked port</td>
                <td>Authorized service center repair invoice or part replacement cost, deducted from security deposit.</td>
              </tr>
              <tr>
                <td><strong>Major damage / Tampered seal:</strong> Smashed display, liquid spill inside console/DJ deck, broken guitar neck, peeled warranty seal</td>
                <td>Official repair quote or fair Indian used-market replacement value (whichever is lower). Deposit applied first; borrower pays any remaining balance.</td>
              </tr>
              <tr>
                <td><strong>Lost, stolen, or unreturned (&gt;48h overdue):</strong> Gear not returned and no extension approved</td>
                <td>100% replacement value + daily late fees. Full KYC dossier released to Lender &amp; Police FIR filed under BNS / IPC criminal breach of trust.</td>
              </tr>
              <tr>
                <td><strong>Pre-existing fault</strong> visible in check-in photos or reported within 2 hours of pickup</td>
                <td><strong className="text-cyan-300">Lender responsibility.</strong> Borrower pays ₹0 and gets full refund or swap.</td>
              </tr>
            </tbody>
          </table>
        </section>

        {/* 4. STANDARD ACCESSORY & REPAIR TARIFF */}
        <section className="terms-block" id="accessory-tariff">
          <h2>4. Standard Accessory &amp; Late Fee Tariff</h2>
          <p>To prevent inflated claims by lenders or haggling by borrowers, LocalDen uses standardized maximum replacement caps for common accessories:</p>
          <table className="terms-table">
            <thead>
              <tr>
                <th>Item / Incident</th>
                <th>Standard Replacement / Fee Cap</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>USB-C Charging Cable / 1/4&quot; Guitar Instrument Cable</td>
                <td>₹350 – ₹500 (or hand over identical working cable at return)</td>
              </tr>
              <tr>
                <td>High-Speed HDMI 2.1 Cable / AC Power Cord</td>
                <td>₹500 – ₹750</td>
              </tr>
              <tr>
                <td>Broken Guitar String Set (Acoustic / Electric)</td>
                <td>₹400 – ₹650</td>
              </tr>
              <tr>
                <td>Carry Bag / Padded Gig Bag / Console Travel Case</td>
                <td>₹900 – ₹1,800 (based on brand)</td>
              </tr>
              <tr>
                <td>Controller Repair (Stick Module / Trigger Spring / Liquid Clean)</td>
                <td>₹900 – ₹1,800 (actual repair bill)</td>
              </tr>
              <tr>
                <td>Lost or Unrepairable Original Controller (DualSense / Xbox / Joy-Con pair)</td>
                <td>₹3,800 – ₹4,800 (fair used-good replacement price)</td>
              </tr>
              <tr>
                <td>Unapproved Late Return (beyond 2-hour grace window)</td>
                <td>1× Daily Rental Rate per extra day + ₹300 late disruption fee if next booking is impacted</td>
              </tr>
            </tbody>
          </table>
          <p className="mt-2">
            <strong>Pro Tip for Borrowers:</strong> Running late or want to keep playing? Tap <strong>&ldquo;+1 Day Extend&rdquo;</strong> in your Dashboard before your return time to extend at the normal daily rate with zero late penalty!
          </p>
        </section>

        {/* 5. DEPOSIT ESCROW & LISTER DUTIES */}
        <section className="terms-block" id="deposit">
          <h2>5. Security Deposit Escrow &amp; Lender Duties</h2>
          <ul>
            <li><strong>Escrow Protection:</strong> Security deposits are held safely in escrow and cannot be arbitrarily pocketed by a lender.</li>
            <li><strong>Fast 24–48h Release:</strong> Once the 4-digit Return PIN is verified and check-out condition is clean, the deposit is released back to the borrower within 24–48 hours.</li>
            <li><strong>Lender Honesty Pledge:</strong> Lenders must hand over clean, 100% tested hardware with all listed cables/controllers and disclose any existing cosmetic marks in check-in photos.</li>
            <li><strong>2-Hour Pickup Check Window:</strong> If a borrower plugs in the gear at home and discovers a pre-existing hardware fault, they must message on WhatsApp/Dashboard within <strong>2 hours of handover</strong> for an immediate replacement or 100% refund.</li>
          </ul>
        </section>

        {/* 6. DISPUTES & SUPPORT */}
        <section className="terms-block" id="disputes">
          <h2>6. 24-Hour Dispute Resolution &amp; Support</h2>
          <p>
            If anything goes wrong at return, either party can raise a ticket in the <strong>Dispute Center</strong> within <strong>24 hours of return</strong>, or contact our Trust &amp; Safety team on WhatsApp at <strong>{SUPPORT_PHONE}</strong> or email <strong>{SUPPORT_EMAIL}</strong>.
          </p>
          <p>
            Our team compares the timestamped Check-In Photos, Check-Out Photos, Dual-OTP logs, and Signed Rental Pact to issue a fair, binding resolution within 48 hours.
          </p>
          <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between gap-3 flex-wrap">
            <Link to="/browse" className="btn-primary text-xs py-2.5 px-5">
              🎮 Browse Verified Gear
            </Link>
            <Link to="/list-item" className="btn-outline text-xs py-2.5 px-5">
              🛡️ List Your Gear Safely
            </Link>
          </div>
        </section>
      </article>
    </div>
  )
}

