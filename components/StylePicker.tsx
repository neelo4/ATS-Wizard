"use client"
import { useResumeStore } from '@/lib/store'

const fonts = [
  { key: 'sans', label: 'Sans' },
  { key: 'serif', label: 'Serif' },
  { key: 'mono', label: 'Mono' },
  { key: 'avenir', label: 'Avenir' },
] as const

const colors = ['#2563eb', '#16a34a', '#f59e0b', '#e11d48', '#7c3aed', '#0d9488']

export default function StylePicker() {
  const style = useResumeStore((s) => s.style)
  const setStyle = useResumeStore((s) => s.setStyle)
  return (
    <div className="segmented" id="tour-style" aria-label="Style picker">
      <select
        className="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-800"
        value={style.font}
        onChange={(e) => setStyle({ font: e.target.value as any })}
        title="Font family"
      >
        {fonts.map((f) => (
          <option key={f.key as string} value={f.key as string}>{f.label}</option>
        ))}
      </select>
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
