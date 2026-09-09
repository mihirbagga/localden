import { useState, useEffect, useRef } from 'react'
import LogoMark from './LogoMark'

/* ── Spark Particle Canvas ───────────────────────────────── */
function SparkCanvas({ active }) {
  const ref = useRef(null)
  useEffect(() => {
    if (!active) return
    const canvas = ref.current
    const ctx = canvas.getContext('2d')
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
    const cx = canvas.width / 2
    const cy = canvas.height / 2
    const sparks = Array.from({ length: 80 }, () => {
      const angle = Math.random() * Math.PI * 2
      const speed = Math.random() * 12 + 4
      return {
        x: cx, y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - Math.random() * 4,
        life: 1,
        decay: Math.random() * 0.03 + 0.015,
        size: Math.random() * 3 + 1,
        color: Math.random() > 0.5 ? '#a855f7' : '#06b6d4',
      }
    })
    let id
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      sparks.forEach(s => {
        if (s.life <= 0) return
        ctx.save()
        ctx.globalAlpha = s.life
        ctx.shadowColor = s.color
        ctx.shadowBlur = 12
        ctx.fillStyle = s.color
        ctx.beginPath()
        ctx.arc(s.x, s.y, s.size * s.life, 0, Math.PI * 2)
        ctx.fill()
        // trailing line
        ctx.strokeStyle = s.color
        ctx.lineWidth = s.size * 0.5
        ctx.beginPath()
        ctx.moveTo(s.x, s.y)
        ctx.lineTo(s.x - s.vx * 3, s.y - s.vy * 3)
        ctx.stroke()
        ctx.restore()
        s.x += s.vx
        s.y += s.vy
        s.vy += 0.35
        s.life -= s.decay
        s.vx *= 0.97
      })
      if (sparks.some(s => s.life > 0)) id = requestAnimationFrame(draw)
    }
    draw()
    return () => cancelAnimationFrame(id)
  }, [active])

  return (
    <canvas ref={ref} className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 5 }} />
  )
}

/* ── Left Warrior SVG ────────────────────────────────────── */
function LeftWarrior() {
  return (
    <svg width="220" height="380" viewBox="0 0 220 380" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="lbglow" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="8" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter id="leye" x="-200%" y="-200%" width="500%" height="500%">
          <feGaussianBlur stdDeviation="4" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <linearGradient id="lblade" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#7c3aed"/>
          <stop offset="50%" stopColor="#a855f7"/>
          <stop offset="100%" stopColor="#e9d5ff"/>
        </linearGradient>
      </defs>

      {/* Ground shadow */}
      <ellipse cx="100" cy="372" rx="55" ry="8" fill="#a855f7" opacity="0.12"/>

      {/* Cape flowing left/behind */}
      <path d="M85 125 Q35 170 18 270 Q45 258 65 215 Q74 175 88 148Z"
        fill="#1a0030" opacity="0.9"/>
      <path d="M85 125 Q25 180 10 290 Q38 278 55 235 Q68 185 84 150Z"
        fill="#0d0020" opacity="0.5"/>

      {/* Back leg */}
      <path d="M70 200 Q63 248 58 305 Q72 310 80 305 Q78 248 84 200Z" fill="#0a0a1a"/>

      {/* Front leg — lunging forward */}
      <path d="M86 200 Q102 248 114 302 Q128 296 123 290 Q108 240 95 200Z" fill="#111128"/>

      {/* Boot left */}
      <path d="M56 298 Q48 315 50 325 Q64 330 80 325 Q82 312 80 303Z" fill="#0a0a1a"/>
      {/* Boot right */}
      <path d="M110 286 Q108 305 115 316 Q128 312 132 305 Q128 294 122 288Z" fill="#111128"/>

      {/* Torso */}
      <path d="M62 112 Q54 198 60 205 Q80 215 100 205 Q108 198 100 112 Q80 100 62 112Z"
        fill="#0d0d1a"/>
      {/* Chest plate */}
      <path d="M67 122 Q62 188 68 194 Q80 200 93 194 Q98 188 93 122 Q80 113 67 122Z"
        fill="#160530" stroke="#a855f720" strokeWidth="1"/>
      {/* Armor lines */}
      <line x1="80" y1="130" x2="80" y2="185" stroke="#a855f715" strokeWidth="1"/>
      <line x1="67" y1="155" x2="93" y2="155" stroke="#a855f715" strokeWidth="1"/>

      {/* Belt */}
      <rect x="63" y="195" width="37" height="10" rx="3" fill="#2a0050"/>

      {/* Back/left arm (relaxed, behind body) */}
      <path d="M63 118 Q42 145 36 178 Q47 183 53 176 Q56 148 70 128Z" fill="#0d0d1a"/>

      {/* Right arm — raised, holding katana diagonally */}
      <path d="M95 112 Q118 85 148 55 Q140 44 133 50 Q108 76 86 106Z" fill="#111128"/>

      {/* Head */}
      <circle cx="80" cy="75" r="33" fill="#0d0d1a"/>
      {/* Neck */}
      <rect x="72" y="100" width="16" height="15" rx="3" fill="#0d0d1a"/>

      {/* Spiky anime hair */}
      <path d="M52 58 L38 28 L57 52" fill="#060610"/>
      <path d="M64 48 L60 22 L72 46" fill="#060610"/>
      <path d="M80 43 L82 18 L90 44" fill="#060610"/>
      <path d="M95 50 L108 28 L98 56" fill="#060610"/>
      <path d="M106 64 L120 50 L108 72" fill="#060610"/>
      {/* Hair base */}
      <path d="M50 62 Q55 48 80 42 Q105 48 110 64 Q105 50 80 46 Q55 50 50 62Z"
        fill="#060610"/>

      {/* Face lower — mask */}
      <path d="M58 82 Q57 100 68 106 Q80 110 92 106 Q103 100 102 82 Q91 78 58 82Z"
        fill="#0a0520"/>

      {/* Eye — glowing purple */}
      <ellipse cx="70" cy="68" rx="8" ry="6" fill="#a855f7" filter="url(#leye)"/>
      <ellipse cx="70" cy="68" rx="5" ry="3.5" fill="#c084fc"/>
      <ellipse cx="70" cy="68" rx="2.5" ry="2" fill="white"/>
      <ellipse cx="70" cy="68" rx="1" ry="1" fill="#0d0d1a"/>

      {/* Second eye (partially hidden) */}
      <ellipse cx="88" cy="68" rx="6" ry="5" fill="#7c3aed" opacity="0.5" filter="url(#leye)"/>

      {/* Katana handle / tsuka */}
      <path d="M133 50 L155 30" stroke="#5c3d00" strokeWidth="11" strokeLinecap="round"/>
      <path d="M133 50 L155 30" stroke="#8b6200" strokeWidth="7" strokeLinecap="round"/>
      {/* Handle wrap */}
      <path d="M136 47 L140 43" stroke="#3a2500" strokeWidth="4"/>
      <path d="M141 42 L145 38" stroke="#3a2500" strokeWidth="4"/>
      <path d="M146 37 L150 33" stroke="#3a2500" strokeWidth="4"/>

      {/* Tsuba (guard) */}
      <ellipse cx="131" cy="52" rx="11" ry="6" fill="#6b4d00"
        transform="rotate(-44 131 52)"/>
      <ellipse cx="131" cy="52" rx="8" ry="4" fill="#8b6500"
        transform="rotate(-44 131 52)"/>

      {/* BLADE — glowing purple, extending to right edge */}
      <line x1="152" y1="32" x2="220" y2="-20"
        stroke="url(#lblade)" strokeWidth="5" strokeLinecap="round"
        filter="url(#lbglow)"/>
      <line x1="152" y1="32" x2="220" y2="-20"
        stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.8"/>
      {/* Blade edge shimmer */}
      <line x1="156" y1="35" x2="220" y2="-15"
        stroke="#e9d5ff" strokeWidth="0.8" strokeLinecap="round" opacity="0.5"/>
    </svg>
  )
}

/* ── Right Warrior SVG ───────────────────────────────────── */
function RightWarrior() {
  return (
    <svg width="220" height="380" viewBox="0 0 220 380" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="rbglow" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="8" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter id="reye" x="-200%" y="-200%" width="500%" height="500%">
          <feGaussianBlur stdDeviation="4" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <linearGradient id="rblade" x1="100%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="#0e7490"/>
          <stop offset="50%" stopColor="#06b6d4"/>
          <stop offset="100%" stopColor="#cffafe"/>
        </linearGradient>
      </defs>

      {/* Ground shadow */}
      <ellipse cx="120" cy="372" rx="55" ry="8" fill="#06b6d4" opacity="0.12"/>

      {/* Cape flowing right/behind */}
      <path d="M135 125 Q185 170 202 270 Q175 258 155 215 Q146 175 132 148Z"
        fill="#001a30" opacity="0.9"/>
      <path d="M135 125 Q195 180 210 290 Q182 278 165 235 Q152 185 136 150Z"
        fill="#001020" opacity="0.5"/>

      {/* Back leg */}
      <path d="M150 200 Q157 248 162 305 Q148 310 140 305 Q142 248 136 200Z" fill="#0a0a1a"/>

      {/* Front leg — lunging forward (left) */}
      <path d="M134 200 Q118 248 106 302 Q92 296 97 290 Q112 240 125 200Z" fill="#111128"/>

      {/* Boot right */}
      <path d="M164 298 Q172 315 170 325 Q156 330 140 325 Q138 312 140 303Z" fill="#0a0a1a"/>
      {/* Boot left */}
      <path d="M110 286 Q112 305 105 316 Q92 312 88 305 Q92 294 98 288Z" fill="#111128"/>

      {/* Torso */}
      <path d="M158 112 Q166 198 160 205 Q140 215 120 205 Q112 198 120 112 Q140 100 158 112Z"
        fill="#0d0d1a"/>
      {/* Chest plate */}
      <path d="M153 122 Q158 188 152 194 Q140 200 127 194 Q122 188 127 122 Q140 113 153 122Z"
        fill="#051630" stroke="#06b6d420" strokeWidth="1"/>
      {/* Armor lines */}
      <line x1="140" y1="130" x2="140" y2="185" stroke="#06b6d415" strokeWidth="1"/>
      <line x1="153" y1="155" x2="127" y2="155" stroke="#06b6d415" strokeWidth="1"/>

      {/* Belt */}
      <rect x="120" y="195" width="37" height="10" rx="3" fill="#002050"/>

      {/* Back/right arm */}
      <path d="M157 118 Q178 145 184 178 Q173 183 167 176 Q164 148 150 128Z" fill="#0d0d1a"/>

      {/* Left arm — raised, holding katana */}
      <path d="M125 112 Q102 85 72 55 Q80 44 87 50 Q112 76 134 106Z" fill="#111128"/>

      {/* Head */}
      <circle cx="140" cy="75" r="33" fill="#0d0d1a"/>
      <rect x="132" y="100" width="16" height="15" rx="3" fill="#0d0d1a"/>

      {/* Spiky anime hair (different style — swept back) */}
      <path d="M168 58 L182 28 L163 52" fill="#060610"/>
      <path d="M156 48 L160 22 L148 46" fill="#060610"/>
      <path d="M140 43 L138 18 L130 44" fill="#060610"/>
      <path d="M125 50 L112 28 L122 56" fill="#060610"/>
      <path d="M114 64 L100 50 L112 72" fill="#060610"/>
      <path d="M170 62 Q165 48 140 42 Q115 48 110 64 Q115 50 140 46 Q165 50 170 62Z"
        fill="#060610"/>

      {/* Face mask */}
      <path d="M162 82 Q163 100 152 106 Q140 110 128 106 Q117 100 118 82 Q129 78 162 82Z"
        fill="#051520"/>

      {/* Eye — glowing cyan */}
      <ellipse cx="150" cy="68" rx="8" ry="6" fill="#06b6d4" filter="url(#reye)"/>
      <ellipse cx="150" cy="68" rx="5" ry="3.5" fill="#22d3ee"/>
      <ellipse cx="150" cy="68" rx="2.5" ry="2" fill="white"/>
      <ellipse cx="150" cy="68" rx="1" ry="1" fill="#0d0d1a"/>

      {/* Second eye */}
      <ellipse cx="132" cy="68" rx="6" ry="5" fill="#0891b2" opacity="0.5" filter="url(#reye)"/>

      {/* Katana handle */}
      <path d="M87 50 L65 30" stroke="#5c3d00" strokeWidth="11" strokeLinecap="round"/>
      <path d="M87 50 L65 30" stroke="#8b6200" strokeWidth="7" strokeLinecap="round"/>
      <path d="M84 47 L80 43" stroke="#3a2500" strokeWidth="4"/>
      <path d="M79 42 L75 38" stroke="#3a2500" strokeWidth="4"/>
      <path d="M74 37 L70 33" stroke="#3a2500" strokeWidth="4"/>

      {/* Tsuba */}
      <ellipse cx="89" cy="52" rx="11" ry="6" fill="#6b4d00"
        transform="rotate(44 89 52)"/>
      <ellipse cx="89" cy="52" rx="8" ry="4" fill="#8b6500"
        transform="rotate(44 89 52)"/>

      {/* BLADE — glowing cyan, extending to left edge */}
      <line x1="68" y1="32" x2="0" y2="-20"
        stroke="url(#rblade)" strokeWidth="5" strokeLinecap="round"
        filter="url(#rbglow)"/>
      <line x1="68" y1="32" x2="0" y2="-20"
        stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.8"/>
      <line x1="64" y1="35" x2="0" y2="-15"
        stroke="#cffafe" strokeWidth="0.8" strokeLinecap="round" opacity="0.5"/>
    </svg>
  )
}

/* ── Clash Flash ─────────────────────────────────────────── */
function ClashFlash({ show }) {
  return (
    <div className="absolute inset-0 pointer-events-none flex items-center justify-center"
      style={{ zIndex: 6 }}>
      {show && (
        <>
          <div style={{
            width: 200, height: 200,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255,255,255,0.95) 0%, rgba(168,85,247,0.6) 40%, transparent 70%)',
            animation: 'clashFlash 0.4s ease-out forwards',
          }}/>
          {/* Cross beams */}
          {[0, 45, 90, 135].map(deg => (
            <div key={deg} style={{
              position: 'absolute',
              width: 4, height: 300,
              background: 'linear-gradient(transparent, white, transparent)',
              transform: `rotate(${deg}deg)`,
              opacity: 0,
              animation: 'beamFlash 0.5s ease-out forwards',
              animationDelay: '0.05s',
            }}/>
          ))}
        </>
      )}
      <style>{`
        @keyframes clashFlash {
          0%   { transform: scale(0); opacity: 1; }
          50%  { transform: scale(1.4); opacity: 0.9; }
          100% { transform: scale(2); opacity: 0; }
        }
        @keyframes beamFlash {
          0%   { opacity: 0.9; height: 0; }
          30%  { opacity: 0.7; height: 300px; }
          100% { opacity: 0; height: 300px; }
        }
      `}</style>
    </div>
  )
}

/* ════════════════════════════════════════════════════════════ */
export default function WelcomeScreen({ onEnter }) {
  const [phase, setPhase] = useState('enter')   // enter → clash → text → ready
  const [sparks, setSparks] = useState(false)
  const [flash, setFlash]   = useState(false)
  const [exiting, setExiting] = useState(false)

  useEffect(() => {
    // Warriors slide in → 1.2s
    const t1 = setTimeout(() => setPhase('clash'), 1800)
    // Clash effect
    const t2 = setTimeout(() => { setFlash(true); setSparks(true) }, 2000)
    const t3 = setTimeout(() => setFlash(false), 2500)
    // Text appears
    const t4 = setTimeout(() => setPhase('text'), 2400)
    // Button appears
    const t5 = setTimeout(() => setPhase('ready'), 3200)

    return () => [t1,t2,t3,t4,t5].forEach(clearTimeout)
  }, [])

  const handleEnter = () => {
    setExiting(true)
    setTimeout(onEnter, 700)
  }

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center overflow-hidden"
      style={{
        zIndex: 999,
        background: exiting
          ? 'transparent'
          : 'radial-gradient(ellipse at 50% 60%, #0d0028 0%, #04040a 60%)',
        opacity: exiting ? 0 : 1,
        transition: 'opacity 0.7s ease',
      }}
    >
      {/* ── Scanline overlay ─────────────────── */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.06) 3px, rgba(0,0,0,0.06) 6px)',
        zIndex: 2,
      }}/>

      {/* ── Background glow blobs ─────────────── */}
      <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 1 }}>
        <div style={{
          position: 'absolute', left: '20%', top: '30%',
          width: 400, height: 400, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(168,85,247,0.12) 0%, transparent 70%)',
        }}/>
        <div style={{
          position: 'absolute', right: '20%', top: '30%',
          width: 400, height: 400, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(6,182,212,0.12) 0%, transparent 70%)',
        }}/>
        <div style={{
          position: 'absolute', left: '50%', top: '40%',
          transform: 'translateX(-50%)',
          width: 300, height: 300, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,255,255,0.03) 0%, transparent 70%)',
        }}/>
      </div>

      {/* ── Spark canvas ─────────────────────── */}
      <SparkCanvas active={sparks} />

      {/* ── Clash flash ──────────────────────── */}
      <ClashFlash show={flash} />

      {/* ── Main content ─────────────────────── */}
      <div className="relative flex flex-col items-center" style={{ zIndex: 10 }}>

        {/* ── Warriors row ─────────────────── */}
        <div className="flex items-end justify-center gap-0 sm:gap-8 mb-8">

          {/* LEFT WARRIOR */}
          <div style={{
            transform: phase === 'enter'
              ? 'translateX(-120vw) rotate(-5deg)'
              : phase === 'clash' || phase === 'text' || phase === 'ready'
              ? 'translateX(-30px) rotate(0deg)'
              : 'translateX(-120vw)',
            transition: 'transform 1.2s cubic-bezier(0.22, 1, 0.36, 1)',
            filter: 'drop-shadow(-8px 0 30px rgba(168,85,247,0.5))',
          }}>
            <LeftWarrior />
          </div>

          {/* CENTER gap — clash zone */}
          <div style={{ width: 60, flexShrink: 0 }} />

          {/* RIGHT WARRIOR */}
          <div style={{
            transform: phase === 'enter'
              ? 'translateX(120vw) rotate(5deg)'
              : phase === 'clash' || phase === 'text' || phase === 'ready'
              ? 'translateX(30px) rotate(0deg)'
              : 'translateX(120vw)',
            transition: 'transform 1.2s cubic-bezier(0.22, 1, 0.36, 1)',
            filter: 'drop-shadow(8px 0 30px rgba(6,182,212,0.5))',
          }}>
            <RightWarrior />
          </div>
        </div>

        {/* ── Text ─────────────────────────── */}
        <div style={{
          opacity: phase === 'text' || phase === 'ready' ? 1 : 0,
          transform: phase === 'text' || phase === 'ready' ? 'translateY(0)' : 'translateY(20px)',
          transition: 'opacity 0.6s ease, transform 0.6s ease',
          textAlign: 'center',
        }}>
          {/* Logo mark */}
          <div style={{
            display: 'flex', justifyContent: 'center', marginBottom: 16,
            animation: 'logoFloat 3s ease-in-out infinite',
          }}>
            <LogoMark size={90} />
          </div>
          <style>{`
            @keyframes logoFloat {
              0%, 100% { transform: translateY(0px) scale(1); filter: drop-shadow(0 0 20px rgba(255,22,102,0.5)); }
              50% { transform: translateY(-8px) scale(1.04); filter: drop-shadow(0 0 30px rgba(0,229,255,0.6)); }
            }
          `}</style>

          {/* Decorative line */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'center', marginBottom: 12 }}>
            <div style={{ height: 1, width: 60, background: 'linear-gradient(90deg, transparent, #ff2e6d)' }}/>
            <span style={{ fontSize: 18 }}>⚔️</span>
            <div style={{ height: 1, width: 60, background: 'linear-gradient(90deg, #00e5ff, transparent)' }}/>
          </div>

          <p style={{
            fontFamily: '"Rajdhani", sans-serif',
            fontSize: 'clamp(0.75rem, 2vw, 0.9rem)',
            fontWeight: 700,
            letterSpacing: '0.4em',
            color: '#00e5ff',
            textTransform: 'uppercase',
            marginBottom: 8,
          }}>
            You have entered
          </p>

          <h1 style={{
            fontFamily: '"Bungee", cursive',
            fontWeight: 400,
            fontSize: 'clamp(2.2rem, 7vw, 4.5rem)',
            lineHeight: 1.1,
            marginBottom: 8,
            background: 'linear-gradient(90deg, #ff2e6d 0%, #ffffff 50%, #00e5ff 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            filter: 'drop-shadow(0 0 30px rgba(255,46,109,0.5))',
          }}>
            लोकल Den
          </h1>

          <p style={{
            fontFamily: '"Rajdhani", sans-serif',
            fontSize: 'clamp(0.8rem, 2vw, 1rem)',
            color: 'rgba(255,255,255,0.4)',
            marginBottom: 32,
            letterSpacing: '0.05em',
          }}>
            Bangalore's Gaming &amp; Music Rental Marketplace
          </p>
        </div>

        {/* ── Enter Button ─────────────────── */}
        <div style={{
          opacity: phase === 'ready' ? 1 : 0,
          transform: phase === 'ready' ? 'translateY(0) scale(1)' : 'translateY(10px) scale(0.95)',
          transition: 'opacity 0.5s ease, transform 0.5s ease',
        }}>
          <button
            onClick={handleEnter}
            style={{
              fontFamily: '"Rajdhani", sans-serif',
              fontWeight: 700,
              fontSize: '1.1rem',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              padding: '14px 52px',
              borderRadius: 12,
              border: 'none',
              cursor: 'pointer',
              background: 'linear-gradient(90deg, #ff2e6d, #00e5ff)',
              color: '#0a0a14',
              boxShadow: '0 0 30px rgba(255,46,109,0.45), 0 0 60px rgba(0,229,255,0.2)',
              position: 'relative',
              overflow: 'hidden',
              transition: 'transform 0.2s, box-shadow 0.2s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'scale(1.06)'
              e.currentTarget.style.boxShadow = '0 0 40px rgba(255,46,109,0.65), 0 0 80px rgba(0,229,255,0.35)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'scale(1)'
              e.currentTarget.style.boxShadow = '0 0 30px rgba(255,46,109,0.45), 0 0 60px rgba(0,229,255,0.2)'
            }}
          >
            ⚔ &nbsp;Enter the Den
          </button>

          <p style={{
            textAlign: 'center',
            marginTop: 14,
            fontSize: '0.7rem',
            color: 'rgba(255,255,255,0.18)',
            letterSpacing: '0.1em',
            fontFamily: '"Rajdhani", sans-serif',
          }}>
            Click or press any key to continue
          </p>

        </div>
      </div>

      {/* ── Keypress to skip after ready ──────── */}
      {phase === 'ready' && (
        <div
          className="absolute inset-0"
          style={{ zIndex: 20, cursor: 'pointer' }}
          onClick={handleEnter}
          onKeyDown={handleEnter}
          tabIndex={0}
        />
      )}
    </div>
  )
}
