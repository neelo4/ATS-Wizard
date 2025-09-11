"use client"
import { useEffect, useRef, useState } from 'react'

export default function Confetti({ duration = 3500, count = 240 }: { duration?: number; count?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!

    let w = (canvas.width = window.innerWidth)
    let h = (canvas.height = window.innerHeight)

    function onResize() {
      w = canvas.width = window.innerWidth
      h = canvas.height = window.innerHeight
    }
    window.addEventListener('resize', onResize)

    const colors = ['#60a5fa', '#34d399', '#fbbf24', '#f472b6', '#a78bfa']
    const pieces = Array.from({ length: count }).map(() => new Piece(w, h, colors))
    let start = performance.now()
    let raf = 0

    const tick = (t: number) => {
      const elapsed = t - start
      ctx.clearRect(0, 0, w, h)
      pieces.forEach((p) => p.update(w, h, elapsed))
      pieces.forEach((p) => p.draw(ctx))
      if (elapsed < duration) raf = requestAnimationFrame(tick)
      else setVisible(false)
    }
    raf = requestAnimationFrame(tick)

    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', onResize) }
  }, [duration])

  if (!visible) return null
  return (
    <div className="pointer-events-none fixed inset-0 z-[1001]">
      <canvas ref={canvasRef} className="h-full w-full"/>
    </div>
  )
}

class Piece {
  x: number
  y: number
  vx: number
  vy: number
  rot: number
  vr: number
  size: number
  color: string
  constructor(w: number, h: number, colors: string[]) {
    this.x = Math.random() * w
    this.y = -Math.random() * h * 0.2
    this.vx = (Math.random() - 0.5) * 2
    this.vy = Math.random() * 2 + 2
    this.rot = Math.random() * Math.PI
    this.vr = (Math.random() - 0.5) * 0.2
    this.size = Math.random() * 6 + 6
    this.color = colors[(Math.random() * colors.length) | 0]
  }
  update(w: number, h: number, elapsed: number) {
    this.x += this.vx + Math.sin((this.y + elapsed * 0.002) / 10) * 0.3
    this.y += this.vy
    this.rot += this.vr
    if (this.y > h + 20) this.y = -10
    if (this.x < -20) this.x = w + 20
    if (this.x > w + 20) this.x = -20
  }
  draw(ctx: CanvasRenderingContext2D) {
    ctx.save()
    ctx.translate(this.x, this.y)
    ctx.rotate(this.rot)
    ctx.fillStyle = this.color
    ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size / 2)
    ctx.restore()
  }
}
