"use client"
import { useResumeStore } from '@/lib/store'

export default function ExperienceForm() {
  const exp = useResumeStore((s) => s.experience)
  const add = useResumeStore((s) => s.addExperience)
  const update = useResumeStore((s) => s.updateExperience)
  const remove = useResumeStore((s) => s.removeExperience)

  return (
    <div className="space-y-4">
      {exp.map((e) => (
        <div key={e.id} className="card">
          <div className="grid min-w-0 grid-cols-1 gap-2 md:grid-cols-4">
            <Text label="Role" value={e.role} onChange={(v) => update(e.id, { role: v })} />
            <Text label="Company" value={e.company} onChange={(v) => update(e.id, { company: v })} />
            <MonthPicker label="Start" value={e.startDate} onChange={(v) => update(e.id, { startDate: v })} />
            <MonthPicker label="End" value={e.endDate || ''} onChange={(v) => update(e.id, { endDate: v })} />
          </div>
          <div className="mt-2">
            <label className="block text-sm font-medium">Achievements</label>
            {e.achievements.map((a, i) => (
              <input
                key={i}
                className="input mt-2"
                value={a}
                onChange={(ev) => {
                  const list = e.achievements.slice()
                  list[i] = ev.target.value
                  update(e.id, { achievements: list })
                }}
                placeholder="Use outcome-oriented bullets (e.g., Increased X by Y%)"
              />
            ))}
            <div className="mt-2 flex gap-2">
              <button className="btn" onClick={() => update(e.id, { achievements: e.achievements.concat('') })}>Add Bullet</button>
              <button className="btn" onClick={() => remove(e.id)}>Remove Experience</button>
            </div>
          </div>
        </div>
      ))}
      <button className="btn" onClick={add}>+ Add Experience</button>
    </div>
  )
}

function Text({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div className="min-w-0">
      <label className="block text-sm font-medium">{label}</label>
      <input className="input mt-1" type={type} value={value} onChange={(e) => onChange(e.target.value)} />
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
