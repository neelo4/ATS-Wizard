"use client"
import { useEffect, useRef, useState } from 'react'

export default function Fireworks({ duration = 3000 }: { duration?: number }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const [show, setShow] = useState(true)

  useEffect(() => {
    const canvas = ref.current!
    const ctx = canvas.getContext('2d')!
    let w = (canvas.width = window.innerWidth)
    let h = (canvas.height = window.innerHeight)
    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1))
    canvas.width = w * dpr; canvas.height = h * dpr; ctx.scale(dpr, dpr)

    function onResize() {
      w = window.innerWidth; h = window.innerHeight
      canvas.width = w * dpr; canvas.height = h * dpr; ctx.scale(dpr, dpr)
    }
    window.addEventListener('resize', onResize)

    const colors = ['#60a5fa', '#34d399', '#fbbf24', '#f472b6', '#a78bfa']
    const rockets: Rocket[] = []
    const particles: Particle[] = []

    const start = performance.now()
    let lastSpawn = 0
    let raf = 0

    function loop(t: number) {
      const elapsed = t - start
      ctx.clearRect(0, 0, w, h)

      // spawn 1 rocket every ~600ms for first half
      if (elapsed - lastSpawn > 600 && elapsed < duration * 0.6) {
        rockets.push(new Rocket(Math.random() * (w * 0.6) + w * 0.2, h, h * (0.35 + Math.random() * 0.2)))
        lastSpawn = elapsed
      }

      rockets.forEach((r) => r.update())
      // explode when reaching target
      for (let i = rockets.length - 1; i >= 0; i--) {
        const r = rockets[i]
        r.draw(ctx)
        if (r.y <= r.targetY) {
          rockets.splice(i, 1)
          const count = 24 + (Math.random() * 8)|0
          const color = colors[(Math.random() * colors.length) | 0]
          for (let j = 0; j < count; j++) {
            particles.push(new Particle(r.x, r.y, color))
          }
        }
      }

      particles.forEach((p) => p.update())
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]
        p.draw(ctx)
        if (p.life <= 0) particles.splice(i, 1)
      }

      if (elapsed < duration) raf = requestAnimationFrame(loop)
      else setShow(false)
    }
    raf = requestAnimationFrame(loop)

    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', onResize) }
  }, [duration])

  if (!show) return null
  return (
    <div className="pointer-events-none fixed inset-0 z-[1001]">
      <canvas ref={ref} className="h-full w-full" />
    </div>
  )
}

class Rocket {
  x: number; y: number; vy: number; targetY: number
  constructor(x: number, h: number, targetY: number) {
    this.x = x
    this.y = h + 10
    this.vy = -6 - Math.random() * 2
    this.targetY = targetY
  }
  update() { this.y += this.vy; this.vy += 0.06 }
  draw(ctx: CanvasRenderingContext2D) {
    ctx.save()
    ctx.strokeStyle = 'rgba(99,102,241,0.7)'
    ctx.beginPath(); ctx.moveTo(this.x, this.y + 6); ctx.lineTo(this.x, this.y - 6); ctx.stroke()
    ctx.restore()
  }
}

class Particle {
  x: number; y: number; vx: number; vy: number; life: number; color: string
  constructor(x: number, y: number, color: string) {
    const angle = Math.random() * Math.PI * 2
    const speed = 1.2 + Math.random() * 2
    this.vx = Math.cos(angle) * speed
    this.vy = Math.sin(angle) * speed - 0.3
    this.x = x; this.y = y
    this.life = 60 + (Math.random() * 40)|0
    this.color = color
  }
  update() { this.x += this.vx; this.y += this.vy; this.vy += 0.015; this.life -= 1 }
  draw(ctx: CanvasRenderingContext2D) {
    ctx.save()
    ctx.globalAlpha = Math.max(0, this.life / 100) * 0.9
    ctx.fillStyle = this.color
    ctx.beginPath(); ctx.arc(this.x, this.y, 2, 0, Math.PI * 2); ctx.fill()
    ctx.restore()
  }
}

