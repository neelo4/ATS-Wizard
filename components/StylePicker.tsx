"use client"
import { useResumeStore } from '@/lib/store'

const fonts = [
  { key: 'sans', label: 'Sans' },
  { key: 'serif', label: 'Serif' },
  { key: 'mono', label: 'Mono' },
] as const

const colors = ['#2563eb', '#16a34a', '#f59e0b', '#e11d48', '#7c3aed', '#0d9488']

export default function StylePicker() {
  const style = useResumeStore((s) => s.style)
  const setStyle = useResumeStore((s) => s.setStyle)
  return (
    <div className="segmented" id="tour-style" aria-label="Style picker">
      {fonts.map((f) => (
        <button key={f.key as string} data-active={style.font === f.key} onClick={() => setStyle({ font: f.key as any })}>{f.label}</button>
      ))}
      <div className="mx-1 h-5 w-px bg-gray-300 dark:bg-gray-700" />
      {colors.map((c) => (
        <button
          key={c}
          onClick={() => setStyle({ accent: c })}
          aria-label={`Accent ${c}`}
          className="h-6 w-6 rounded-full border border-gray-300 dark:border-gray-700"
          style={{ backgroundColor: c }}
        />
      ))}
    </div>
  )
}

