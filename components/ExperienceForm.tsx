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
            <Text label="Start" value={e.startDate} onChange={(v) => update(e.id, { startDate: v })} />
            <Text label="End" value={e.endDate || ''} onChange={(v) => update(e.id, { endDate: v })} />
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

function Text({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="min-w-0">
      <label className="block text-sm font-medium">{label}</label>
      <input className="input mt-1" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  )
}
