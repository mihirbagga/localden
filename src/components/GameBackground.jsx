import { useState, useEffect, useRef } from 'react'

const SYMBOLS = [
  '🎮','🕹️','👾','🎯','⚡','🏆',
  '🎸','🎹','🎵','🎶','🎷','🥁',
  '🎲','💎','✨','🌟','🎧','🎺',
]

export default function GameBackground() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx    = canvas.getContext('2d')
    let animId
    let W = window.innerWidth
    let H = window.innerHeight
    canvas.width  = W
    canvas.height = H

    /* particles */
    const particles = Array.from({ length: 56 }, () => ({
      x:     Math.random() * W,
      y:     Math.random() * H,
      r:     Math.random() * 1.2 + 0.3,
      vx:    (Math.random() - 0.5) * 0.18,
      vy:    -Math.random() * 0.28 - 0.06,
      alpha: Math.random() * 0.28 + 0.08,
      color: ['#ff2e6d','#00e5ff'][Math.floor(Math.random() * 2)],
    }))

    /* floating emoji */
    const floaters = Array.from({ length: 10 }, (_, i) => ({
      x:     Math.random() * W,
      y:     Math.random() * H,
      emoji: SYMBOLS[i % SYMBOLS.length],
      size:  Math.random() * 16 + 10,
      vx:    (Math.random() - 0.5) * 0.2,
      vy:    -Math.random() * 0.3 - 0.05,
      alpha: Math.random() * 0.18 + 0.05,
      phase: Math.random() * Math.PI * 2,
      spd:   Math.random() * 0.004 + 0.002,
    }))

    /* nebula blobs — magenta/cyan palette */
    const blobs = [
      { x: W * 0.15, y: H * 0.25, r: 280, c: 'rgba(255,46,109,0.035)' },
      { x: W * 0.85, y: H * 0.65, r: 300, c: 'rgba(0,229,255,0.028)' },
    ]

    let frame = 0
    const draw = () => {
      ctx.clearRect(0, 0, W, H)
      frame++

      /* base bg */
      ctx.fillStyle = '#0a0a14'
      ctx.fillRect(0, 0, W, H)

      /* nebula */
      blobs.forEach(b => {
        const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r)
        g.addColorStop(0, b.c)
        g.addColorStop(1, 'transparent')
        ctx.fillStyle = g
        ctx.beginPath()
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2)
        ctx.fill()
      })

      /* particles */
      particles.forEach(p => {
        ctx.save()
        ctx.globalAlpha = p.alpha
        ctx.fillStyle   = p.color
        ctx.shadowColor = p.color
        ctx.shadowBlur  = 8
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
        p.x += p.vx
        p.y += p.vy
        if (p.y < -5)    { p.y = H + 5; p.x = Math.random() * W }
        if (p.x < -5)      p.x = W + 5
        if (p.x > W + 5)   p.x = -5
      })

      /* floaters */
      floaters.forEach(f => {
        const wave = Math.sin(frame * f.spd + f.phase) * 10
        ctx.save()
        ctx.globalAlpha   = f.alpha
        ctx.font          = `${f.size}px serif`
        ctx.textAlign     = 'center'
        ctx.textBaseline  = 'middle'
        ctx.fillText(f.emoji, f.x + wave, f.y)
        ctx.restore()
        f.y += f.vy
        f.x += f.vx
        if (f.y < -40)   f.y = H + 40
        if (f.x < -40)   f.x = W + 40
        if (f.x > W + 40) f.x = -40
      })

      animId = requestAnimationFrame(draw)
    }
    draw()

    const onResize = () => {
      W = window.innerWidth
      H = window.innerHeight
      canvas.width  = W
      canvas.height = H
    }
    window.addEventListener('resize', onResize)
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', onResize) }
  }, [])

  return (
    <canvas ref={canvasRef} className="fixed inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 0 }} />
  )
}
