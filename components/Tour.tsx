"use client"
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'

type Step = { id: string; selector: string; title: string; body: string }

export default function Tour({ steps, onClose, onDone }: { steps: Step[]; onClose: () => void; onDone?: () => void }) {
  const [index, setIndex] = useState(0)
  const step = steps[index]
  const [rect, setRect] = useState<DOMRect | null>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    function measure() {
      const el = document.querySelector(step.selector) as HTMLElement | null
      if (!el) { setRect(null); return }
      const r = el.getBoundingClientRect()
      setRect(r)
      el.scrollIntoView({ block: 'center', behavior: 'smooth' })
    }
    measure()
    const t = setTimeout(measure, 250)
    return () => clearTimeout(t)
  }, [step])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') next()
      if (e.key === 'ArrowLeft') prev()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  function next() {
    setIndex((i) => {
      const nextIndex = Math.min(i + 1, steps.length - 1)
      if (nextIndex === i && onDone) onDone()
      return nextIndex
    })
  }
  function prev() { setIndex((i) => Math.max(i - 1, 0)) }

  const ttPos = useMemo(() => {
    if (!rect) return { top: 80, left: 20 }
    const gap = 12
    const top = Math.max(20, rect.bottom + gap)
    const left = Math.max(20, Math.min(rect.left, window.innerWidth - 360))
    return { top, left }
  }, [rect])

  return (
    <div className="pointer-events-auto fixed inset-0 z-[1000]">
      {/* overlay */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] transition-opacity" onClick={onClose} />

      {/* highlight ring */}
      {rect && (
        <div
          className="absolute rounded-xl border-2 border-brand-500 shadow-[0_0_0_6px_rgba(59,130,246,0.3)] transition-all"
          style={{ left: rect.left - 6, top: rect.top - 6, width: rect.width + 12, height: rect.height + 12 }}
        />
      )}

      {/* tooltip */}
      <div
        ref={tooltipRef}
        className="absolute w-[340px] rounded-lg border bg-white p-4 text-gray-900 shadow-lg dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100"
        style={ttPos}
      >
        <div className="text-sm font-bold">{step.title}</div>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{step.body}</p>
        <div className="mt-3 flex items-center justify-between">
          <div className="text-xs text-gray-500">Step {index + 1} of {steps.length}</div>
          <div className="flex gap-2">
            <button className="btn" onClick={onClose}>Skip</button>
            {index > 0 && (
              <button className="btn" onClick={prev}>Back</button>
            )}
            <button className="btn btn-primary" onClick={index === steps.length - 1 ? (onDone || onClose) : next}>{index === steps.length - 1 ? 'Done' : 'Next'}</button>
          </div>
        </div>
      </div>
    </div>
  )
}
