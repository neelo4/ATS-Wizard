"use client"
import { useResumeStore } from '@/lib/store'

export default function ProjectsForm() {
  const projects = useResumeStore((s) => s.projects)
  const add = useResumeStore((s) => s.addProject)
  const update = useResumeStore((s) => s.updateProject)
  const remove = useResumeStore((s) => s.removeProject)
  const instructions = useResumeStore((s) => s.instructions)

  return (
    <div className="space-y-4">
      {projects.map((p) => (
        <div key={p.id} className="card">
          <div className="grid min-w-0 grid-cols-1 gap-2 md:grid-cols-3">
            <div>
              <Text label="Name" value={p.name} onChange={(v) => update(p.id, { name: v })} />
              <NameSuggestions onPick={(v) => update(p.id, { name: v })} context={(p.technologies || []).concat(instructions.keywords || [])} />
            </div>
            <Text label="URL" value={p.url || ''} onChange={(v) => update(p.id, { url: v })} />
            <Text label="Technologies (comma-separated)" value={(p.technologies || []).join(', ')} onChange={(v) => update(p.id, { technologies: v.split(',').map((s) => s.trim()).filter(Boolean) })} />
          </div>
          <label className="mt-2 block text-sm font-medium">Summary</label>
          <textarea className="input mt-1 h-24" rows={2} value={p.summary} onChange={(e) => update(p.id, { summary: e.target.value })} />
          <div className="mt-2">
            <label className="block text-sm font-medium">Highlights</label>
            {p.highlights.map((h, i) => (
              <input key={i} className="input mt-2" value={h} onChange={(ev) => {
                const list = p.highlights.slice()
                list[i] = ev.target.value
                update(p.id, { highlights: list })
              }} />
            ))}
            <div className="mt-2 flex gap-2">
              <button className="btn" onClick={() => update(p.id, { highlights: p.highlights.concat('') })}>Add Highlight</button>
              <button className="btn" onClick={() => remove(p.id)}>Remove Project</button>
            </div>
          </div>
        </div>
      ))}
      <button className="btn" onClick={add}>+ Add Project</button>
    </div>
  )
}

function Text({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-sm font-medium">{label}</label>
      <input className="input mt-1" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  )
}

function NameSuggestions({ onPick, context }: { onPick: (v: string) => void; context: string[] }) {
  const base = [
    'Project Atlas',
    'Insight Dash',
    'SkillForge',
    'StackScout',
    'Portfolio Pilot',
    'HireHero',
    'RoleReady Pro',
  ]
  const extras = (context || [])
    .map((c) => c.toLowerCase())
    .filter((c) => /^[a-z0-9\-]+$/.test(c))
    .slice(0, 2)
    .map((c) => `${capitalize(c)} Toolkit`)
  const suggestions = Array.from(new Set([...extras, ...base])).slice(0, 6)
  if (!suggestions.length) return null
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {suggestions.map((s) => (
        <button key={s} type="button" className="chip hover:bg-brand-100" onClick={() => onPick(s)} title="Use this name">
          {s}
        </button>
      ))}
    </div>
  )
}

function capitalize(s: string) { return s.charAt(0).toUpperCase() + s.slice(1) }
