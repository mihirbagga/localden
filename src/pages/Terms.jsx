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
          <p className="section-label mb-3">Legal</p>
          <h1 className="terms-title">Terms &amp; Damage Policy</h1>
          <p className="terms-lead">
            Read this before you book. Booking means you accept these rules.
          </p>
        </header>

        <nav className="terms-nav" aria-label="Terms sections">
          <a href="#renting">Renting</a>
          <a href="#damage">Damage policy</a>
          <a href="#deposit">Deposit</a>
          <a href="#listers">Listers</a>
          <a href="#disputes">Disputes</a>
        </nav>

        <section className="terms-block" id="renting">
          <h2>1. Before you rent</h2>
          <p>लोकल Den is a peer-to-peer marketplace. The lister owns the gear. We help you book, pay, and settle disputes. We do not own the items.</p>
          <ul>
            <li>You must be 18+ and complete KYC before your first rental.</li>
            <li>You rent for personal use only. No resale, sub-rent, or commercial gigs unless the lister agrees in writing.</li>
            <li>Check the listing photos, condition, and included accessories before you pay.</li>
            <li>At handover, inspect the item with the lister. Take <strong>clear before-photos</strong> (all sides, ports, screen, extras). Same at return.</li>
            <li>Return on the agreed date, same condition (normal wear excepted), with all accessories and packaging the lister gave you.</li>
            <li>Late return: extra day charged at the listing day rate, plus any loss the lister can show (next booking cancelled).</li>
          </ul>
        </section>

        <section className="terms-block" id="damage">
          <h2>2. Damage policy</h2>
          <p>You are responsible for the gear from pickup until the lister confirms return. Treat it like it is not yours — because it is not.</p>
          <table className="terms-table">
            <thead>
              <tr>
                <th>What happened</th>
                <th>Who pays</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Normal wear: light scuffs, fingerprints, used pads, dusty vents</td>
                <td>Nobody. Deposit returns in full.</td>
              </tr>
              <tr>
                <td>Minor damage: deep scratch, cracked clip, missing cheap accessory (cable, cap)</td>
                <td>Repair or replacement cost, capped at the deposit. Taken from deposit.</td>
              </tr>
              <tr>
                <td>Major damage: smashed screen, bent disc drive, water damage, broken neck, unusable item</td>
                <td>Repair quote or fair market value of the unit, whichever is lower. Deposit first, then you owe the rest.</td>
              </tr>
              <tr>
                <td>Lost, stolen, or not returned</td>
                <td>Full replacement value (same model, used-good market price in India). Deposit applied. Police complaint if stolen.</td>
              </tr>
              <tr>
                <td>Pre-existing fault shown in before-photos or listing</td>
                <td>Lister. Not your bill.</td>
              </tr>
            </tbody>
          </table>
          <p><strong>Fair value.</strong> We use current used-market price for the same model in Bangalore / India, not the original MRP. Lister cannot charge “sentimental value”.</p>
          <p><strong>Proof.</strong> Claims need before/after photos, or a written note both sides signed at handover. No photos from either side = we split the doubt and may hold only a partial deposit.</p>
          <p><strong>Report window.</strong> Lister must flag damage within <strong>24 hours</strong> of return. Renter must flag a defect within <strong>6 hours</strong> of pickup. After that, we assume it happened on your watch.</p>
          <p><strong>No cover for.</strong> Drunken use, pets chewing gear, rain without a bag, leaving kit in an auto/Uber, lending to a friend. That is all on you.</p>
        </section>

        <section className="terms-block" id="deposit">
          <h2>3. Security deposit</h2>
          <ul>
            <li>Deposit is collected with the booking and held until return is confirmed.</li>
            <li>Clean return + no dispute = deposit released after the lister confirms, usually within 24–48 hours.</li>
            <li>If a claim is open, we hold the deposit until both sides send proof or 7 days pass. Then we decide.</li>
            <li>Deposit is not a license to trash the item. Damage above deposit is still owed.</li>
          </ul>
        </section>

        <section className="terms-block" id="listers">
          <h2>4. Lister duties</h2>
          <ul>
            <li>Describe condition honestly. Hidden faults that show up at pickup are on you.</li>
            <li>Hand over a working item with the accessories you listed.</li>
            <li>Do the photo ritual. If you skip it, a later damage claim is weak.</li>
            <li>Do not keep the deposit for “I just don’t like how they used it.” Wear is not damage.</li>
          </ul>
        </section>

        <section className="terms-block" id="disputes">
          <h2>5. Disputes &amp; support</h2>
          <p>
            Open a ticket within 24 hours of return: call or WhatsApp <strong>{SUPPORT_PHONE}</strong> or email <strong>{SUPPORT_EMAIL}</strong>.
            Send booking ID, photos, and what you want (repair / part refund / full value).
          </p>
          <p>We mediate in good faith. Our call on deposit split is final for the platform. You can still take a civil claim outside लोकल Den.</p>
          <p>These terms can change. The version on this page at the time you tap pay is the one that applies to that booking.</p>
        </section>
      </article>
    </div>
  )
}
