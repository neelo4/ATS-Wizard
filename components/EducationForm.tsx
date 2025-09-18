"use client"
import { useResumeStore } from '@/lib/store'

export default function EducationForm() {
  const items = useResumeStore((s) => s.education)
  const add = useResumeStore((s) => s.addEducation)
  const update = useResumeStore((s) => s.updateEducation)
  const remove = useResumeStore((s) => s.removeEducation)
  return (
    <div className="space-y-4">
      {items.map((ed) => (
        <div key={ed.id} className="card">
          <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
            <Field label="School" value={ed.school} onChange={(v) => update(ed.id, { school: v })} />
            <Field label="Degree" value={ed.degree} onChange={(v) => update(ed.id, { degree: v })} />
            <Field label="Field" value={ed.field || ''} onChange={(v) => update(ed.id, { field: v })} />
            <Field label="Location" value={ed.location || ''} onChange={(v) => update(ed.id, { location: v })} />
          </div>
          <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2">
            <MonthPicker label="Start" value={ed.startDate || ''} onChange={(v) => update(ed.id, { startDate: v })} />
            <MonthPicker label="End" value={ed.endDate || ''} onChange={(v) => update(ed.id, { endDate: v })} />
          </div>
          <div className="mt-2">
            <button className="btn" onClick={() => remove(ed.id)}>Remove</button>
          </div>
        </div>
      ))}
      <button className="btn" onClick={add}>+ Add Education</button>
    </div>
  )
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="min-w-0">
      <label className="block text-sm font-medium">{label}</label>
      <input className="input mt-1" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  )
}

function MonthPicker({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const now = new Date()
  const currentYear = now.getFullYear()
  const years: number[] = []
  for (let y = currentYear + 5; y >= 1990; y--) years.push(y)
  const [yy, mm] = parseYM(value)
  return (
    <div className="min-w-0">
      <label className="block text-sm font-medium">{label}</label>
      <div className="mt-1 flex gap-2">
        <select className="input" value={mm} onChange={(e) => onChange(formatYM(yy, Number(e.target.value)))}>
          {months.map((m, i) => (
            <option key={i} value={i+1}>{m}</option>
          ))}
        </select>
        <select className="input" value={yy} onChange={(e) => onChange(formatYM(Number(e.target.value), mm))}>
          {years.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>
    </div>
  )
}

function parseYM(v: string): [number, number] {
  const m = /^([0-9]{4})-([0-9]{2})$/.exec(v || '')
  if (!m) {
    const d = new Date()
    return [d.getFullYear(), d.getMonth()+1]
  }
  return [Number(m[1]), Number(m[2])]
}

function formatYM(y: number, m: number): string {
  const mm = String(m).padStart(2, '0')
  return `${y}-${mm}`
}

