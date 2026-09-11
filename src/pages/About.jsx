import { Link } from 'react-router-dom'
import GameBackground from '../components/GameBackground'
import './about.css'

const PERSONAS = [
  { title: '🎮 The Gamer', line: '“Bro, just one more match.”' },
  { title: '🎸 The Musician', line: '“I\'ve written a song.” Has written 3 chords.' },
  { title: '🎧 The Creator', line: '“I\'m starting a podcast.”' },
  { title: '🥳 The Party Planner', line: '“Guys, I have an idea…”' },
  { title: '🤓 The Gadget Nerd', line: '“I need to test this before buying it.”' },
]

export default function About() {
  return (
    <div className="about-page">
      <div className="grid-floor" />
      <GameBackground />

      <article className="about-wrap">
        <header className="about-head">
          <p className="section-label mb-3">About Us</p>
          <h1 className="about-title">🎮 Welcome to लोकल Den.</h1>
          <p className="about-hook">
            Your wallet called. It said, <em>“Please stop buying everything.”</em> 😌
          </p>
        </header>

        <section className="about-section">
          <p>Ever wanted to play on that PS5 for a weekend?</p>
          <p>Need a guitar for that one song you <em>swear</em> you&apos;re going to learn?</p>
          <p>
            Planning a gaming night but your setup looks like it was assembled by two potatoes and an HDMI cable?
          </p>
          <p><strong>We&apos;ve got you.</strong></p>
          <p>
            Welcome to <strong>लोकल Den</strong> — your local playground for{' '}
            <strong>gaming &amp; music gear on rent.</strong>
          </p>
        </section>

        <section className="about-section">
          <h2>🕹️ Why buy when you can play?</h2>
          <p>Let&apos;s be honest.</p>
          <p>You don&apos;t need to <strong>own</strong> a ₹50,000 console to have a legendary weekend.</p>
          <p>
            You don&apos;t need to buy a guitar to discover that your musical career ends at{' '}
            <strong>“Wonderwall.”</strong>
          </p>
          <p>And you definitely don&apos;t need another gadget sitting in your room collecting dust.</p>
          <p>
            At लोकल Den, you can <strong>rent it. Play it. Create with it. Return it.</strong>
          </p>
          <p>Simple.</p>
        </section>

        <section className="about-section">
          <h2>🎮 GAME ON.</h2>
          <p>Console? <span className="about-punch">Rent it.</span></p>
          <p>Controller? <span className="about-punch">Rent it.</span></p>
          <p>Gaming setup for the weekend? <span className="about-punch">Build your squad.</span></p>
          <p>Want to host the ultimate FIFA/FC, GTA, COD or Mario Kart night?</p>
          <p>We&apos;ve got the gear.</p>
          <p>
            <strong>You bring the friends. We&apos;ll bring the excuses for why you lost.</strong> 🫡
          </p>
        </section>

        <section className="about-section">
          <h2>🎸 MAKE SOME NOISE.</h2>
          <p>Maybe you&apos;re a guitarist.</p>
          <p>Maybe you&apos;re a drummer.</p>
          <p>Maybe you&apos;re a bedroom DJ.</p>
          <p>
            Maybe you just watched one YouTube tutorial and suddenly you&apos;re convinced you&apos;re the next rockstar.
          </p>
          <p><strong>Respect.</strong></p>
          <p>
            Rent the instrument or music gear you need and experiment without committing your entire bank account to your new personality.
          </p>
          <ul className="about-list">
            <li>🎸 Guitars</li>
            <li>🎹 Keyboards</li>
            <li>🥁 Instruments</li>
            <li>🎤 Microphones</li>
            <li>🎧 Audio gear</li>
            <li>🔊 Speakers</li>
            <li>…and whatever else helps you <strong>make some beautiful noise.</strong></li>
          </ul>
        </section>

        <section className="about-section">
          <h2>🤝 It&apos;s not just renting.</h2>
          <p><strong>It&apos;s sharing the stuff we love.</strong></p>
          <p>Someone has a gaming console sitting unused.</p>
          <p>Someone else has been waiting months to play it.</p>
          <p>Someone owns a guitar they haven&apos;t touched since 2022.</p>
          <p>Someone else is ready to start their band.</p>
          <p><strong>लोकल Den connects them.</strong></p>
          <p>Owners earn from the gear they already have.</p>
          <p>Renters get access without the painful “Add to Cart → Cry → Checkout” experience.</p>
          <p>And good equipment gets used instead of gathering dust.</p>
        </section>

        <section className="about-section about-philosophy">
          <h2>🧠 Our philosophy</h2>
          <p className="about-mantra">OWN LESS. EXPERIENCE MORE.</p>
          <p>Why should expensive gear spend 95% of its life sitting in a cupboard?</p>
          <p>We believe great experiences shouldn&apos;t require great spending.</p>
          <p>
            So we&apos;re building a community where <strong>gaming, music and cool gadgets move from one local person to another.</strong>
          </p>
          <p>Because your neighbour&apos;s unused PS5 might just be someone&apos;s best weekend.</p>
        </section>

        <section className="about-section">
          <h2>👀 So... what&apos;s your Den?</h2>
          <div className="about-personas">
            {PERSONAS.map((persona) => (
              <div key={persona.title} className="about-persona">
                <h3>{persona.title}</h3>
                <p>{persona.line}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="about-close">
          <p>Whoever you are... <strong>Welcome to the Den.</strong></p>
          <p className="about-tag">लोकल Den — Rent the gear. Live the experience.</p>
          <p>🎮 Play it. 🎸 Make it. 🔊 Share it.</p>
          <div className="about-actions">
            <Link to="/browse" className="btn-primary" aria-label="Browse gear">Browse Gear</Link>
            <Link to="/list-item" className="btn-secondary" aria-label="List your gear">List Your Gear</Link>
            <Link to="/contact" className="btn-outline" aria-label="Contact support">Contact</Link>
          </div>
        </div>
      </article>
    </div>
  )
}
