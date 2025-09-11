"use client"
import { useEffect, useRef, useState } from 'react'

export default function Modal({ open, title, children, onClose, overlayClassName }: { open: boolean; title: string; children: React.ReactNode; onClose: () => void; overlayClassName?: string }) {
  const [dragging, setDragging] = useState(false)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const start = useRef<{ x: number; y: number; mx: number; my: number } | null>(null)

  useEffect(() => {
    function onEsc(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    if (open) document.addEventListener('keydown', onEsc)
    return () => document.removeEventListener('keydown', onEsc)
  }, [open, onClose])

  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (!start.current) return
      const dx = e.clientX - start.current.mx
      const dy = e.clientY - start.current.my
      setPos({ x: start.current.x + dx, y: start.current.y + dy })
    }
    function onUp() { start.current = null; setDragging(false) }
    if (dragging) {
      window.addEventListener('mousemove', onMove)
      window.addEventListener('mouseup', onUp)
    }
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [dragging])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className={`absolute inset-0 ${overlayClassName || 'bg-black/30 backdrop-blur-sm'}`} onClick={onClose} />
      <div
        className="relative w-full max-w-md rounded-lg bg-white shadow-lg dark:bg-gray-900"
        style={{ transform: `translate(${pos.x}px, ${pos.y}px)` }}
      >
        <div
          className="flex cursor-move items-center justify-between rounded-t-lg bg-brand-600 px-4 py-3 text-white"
          onMouseDown={(e) => { start.current = { x: pos.x, y: pos.y, mx: e.clientX, my: e.clientY }; setDragging(true) }}
        >
          <h2 className="text-sm font-semibold">{title}</h2>
          <button onClick={onClose} className="btn btn-ghost text-white">✕</button>
        </div>
        <div className="p-5">
          {children}
        </div>
      </div>
    </div>
  )
}
