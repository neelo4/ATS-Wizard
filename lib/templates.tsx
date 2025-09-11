import React from 'react'
import type { GeneratedResume, ResumeTemplateKey, ResumeData } from './types'

export type ResumeView = 'screen' | 'print'

export function ResumeDocument({ data, generated, view = 'screen' }: { data: ResumeData; generated: GeneratedResume; view?: ResumeView }) {
  const Template =
    data.template === 'classic' ? ClassicTemplate : data.template === 'vibrant' ? VibrantTemplate : ModernTemplate
  return <Template data={data} generated={generated} view={view} />
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-sm font-semibold tracking-wider text-gray-700 uppercase">{children}</h3>
}

function ModernTemplate({ data, generated, view = 'screen' }: { data: ResumeData; generated: GeneratedResume; view?: ResumeView }) {
  // derive current/other experience for better layout
  const current = pickCurrent(generated.sections.experience)
  const rest = generated.sections.experience.filter((e) => e.id !== current?.id)
  return (
    <div className="relative rounded-lg border bg-white p-6 text-gray-900 shadow">
      {view === 'screen' && (
        <ATSBadge score={generated.atsScore ?? 0} />
      )}
      <header className="border-b pb-4">
        <h1 className="text-2xl font-bold">{data.basics.fullName || 'Your Name'}</h1>
        <p className="text-sm text-gray-600">{data.basics.headline || 'Title / Role'}</p>
        <Contact data={data} colorful />
      </header>

      <section className="mt-4">
        <SectionTitle>Profile</SectionTitle>
        <p className="mt-1 text-sm leading-relaxed">{generated.sections.summary}</p>
      </section>

      {current && (
        <section className="mt-4">
          <SectionTitle>Current Role</SectionTitle>
          <div className="mt-2 rounded border p-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <div className="font-medium">{current.role || 'Role'} • {current.company || 'Company'}</div>
              <div className="text-gray-500">{current.startDate}{current.endDate ? ` – ${current.endDate}` : current.current ? ' – Present' : ''}</div>
            </div>
            <ul className="mt-2 list-disc pl-5 text-sm">
              {current.achievements.slice(0, 4).map((a: string, i: number) => (
                <li key={i}>{a}</li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {!!rest.length && (
        <section className="mt-4">
          <SectionTitle>Experience</SectionTitle>
          <div className="mt-2 space-y-3">
            {rest.map((e) => (
              <div key={e.id} className="rounded border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <div className="font-medium">{e.role || 'Role'} • {e.company || 'Company'}</div>
                  <div className="text-gray-500">{e.startDate}{e.endDate ? ` – ${e.endDate}` : e.current ? ' – Present' : ''}</div>
                </div>
                <ul className="mt-2 list-disc pl-5 text-sm">
                  {e.achievements.map((a: string, i: number) => (
                    <li key={i}>{a}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}

      {!!generated.sections.projects.length && (
        <section className="mt-4">
          <SectionTitle>Projects</SectionTitle>
          <div className="mt-2 space-y-3">
            {generated.sections.projects.map((p) => (
              <div key={p.id} className="rounded border p-3">
                <div className="flex items-center justify-between text-sm">
                  <div className="font-medium">{p.name}</div>
                  {p.url && (
                    <a href={p.url} className="text-brand-600 hover:underline" target="_blank" rel="noreferrer">Link</a>
                  )}
                </div>
                <p className="mt-1 text-sm text-gray-700">{p.summary}</p>
                <ul className="mt-2 list-disc pl-5 text-sm">
                  {p.highlights.map((h: string, i: number) => (
                    <li key={i}>{h}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="mt-4">
        <SectionTitle>Skills</SectionTitle>
          <div className="mt-1 flex flex-wrap gap-2">
            {generated.sections.skills.map((s: string, i: number) => (
              <span key={i} className="rounded bg-gray-100 px-2 py-1 text-xs">
                {s}
              </span>
            ))}
          </div>
      </section>

      {view === 'screen' && (
        <footer className="mt-6 border-t pt-3 text-xs text-gray-500">
          ATS Match: {generated.atsScore ?? 0}%
          {generated.matchedKeywords?.length ? (
            <span> • Keywords: {generated.matchedKeywords.join(', ')}</span>
          ) : null}
        </footer>
      )}
    </div>
  )
}

function ClassicTemplate({ data, generated }: { data: ResumeData; generated: GeneratedResume }) {
  return (
    <div className="bg-white p-6 text-gray-900">
      <h1 className="text-2xl font-extrabold tracking-tight">{data.basics.fullName || 'Your Name'}</h1>
      <Contact data={data} />

      <hr className="my-3" />
      <h3 className="text-[12px] font-bold uppercase tracking-widest">Professional Summary</h3>
      <p className="mt-1 text-sm leading-relaxed">{generated.sections.summary}</p>

      <hr className="my-3" />
      <h3 className="text-[12px] font-bold uppercase tracking-widest">Skills</h3>
      <p className="mt-1 text-sm">{generated.sections.skills.join(' • ')}</p>

      <hr className="my-3" />
      <h3 className="text-[12px] font-bold uppercase tracking-widest">Experience</h3>
      {generated.sections.experience.map((e) => (
        <div key={e.id} className="mt-2">
          <div className="flex justify-between text-sm">
            <span className="font-semibold">{e.role}</span>
            <span className="text-gray-600">{e.startDate}{e.endDate ? ` – ${e.endDate}` : e.current ? ' – Present' : ''}</span>
          </div>
          <div className="text-sm text-gray-700">{e.company}</div>
          <ul className="mt-1 list-outside list-disc pl-5 text-sm">
            {e.achievements.map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ul>
        </div>
      ))}

      <hr className="my-3" />
      <h3 className="text-[12px] font-bold uppercase tracking-widest">Projects</h3>
      {generated.sections.projects.map((p) => (
        <div key={p.id} className="mt-2">
          <div className="flex justify-between text-sm">
            <span className="font-semibold">{p.name}</span>
            {p.url && (
              <a href={p.url} className="text-brand-700 hover:underline" target="_blank" rel="noreferrer">
                {p.url}
              </a>
            )}
          </div>
          <p className="text-sm">{p.summary}</p>
          <ul className="mt-1 list-outside list-disc pl-5 text-sm">
            {p.highlights.map((h, i) => (
              <li key={i}>{h}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}

function pickCurrent(list: any[]) {
  if (!list || !list.length) return null
  const current = list.find((e) => e.current || !e.endDate)
  return current || list[0]
}

function ATSBadge({ score }: { score: number }) {
  const color = score >= 80 ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : score >= 60 ? 'bg-amber-100 text-amber-800 border-amber-200' : 'bg-rose-100 text-rose-800 border-rose-200'
  return (
    <div className={`absolute right-3 top-3 rounded-full border px-3 py-1 text-xs font-semibold ${color}`} title="Estimated ATS match based on JD keywords">
      ATS {score}%
    </div>
  )
}

function VibrantTemplate({ data, generated }: { data: ResumeData; generated: GeneratedResume }) {
  return (
    <div className="overflow-hidden rounded-lg border bg-white text-gray-900 shadow">
      <div className="bg-brand-600 px-6 py-5 text-white">
        <h1 className="text-3xl font-extrabold tracking-tight">{data.basics.fullName || 'Your Name'}</h1>
        <p className="text-sm opacity-90">{data.basics.headline || 'Title / Role'}</p>
        <div className="mt-2 text-xs opacity-95">
          <Contact data={data} invert />
        </div>
      </div>
      <div className="grid gap-6 p-6 md:grid-cols-2">
        <section>
          <SectionTitle>Summary</SectionTitle>
          <p className="mt-1 text-sm leading-relaxed">{generated.sections.summary}</p>
          <SectionTitle>Skills</SectionTitle>
          <div className="mt-1 flex flex-wrap gap-2">
            {generated.sections.skills.map((s, i) => (
              <span key={i} className="rounded-full bg-brand-50 px-2 py-1 text-xs text-brand-800">
                {s}
              </span>
            ))}
          </div>
        </section>
        <section>
          <SectionTitle>Projects</SectionTitle>
          <div className="mt-2 space-y-3">
            {generated.sections.projects.map((p) => (
              <div key={p.id} className="rounded border p-3">
                <div className="flex items-center justify-between text-sm">
                  <div className="font-medium">{p.name}</div>
                  {p.url && (
                    <a href={p.url} className="text-brand-600 hover:underline" target="_blank" rel="noreferrer">Link</a>
                  )}
                </div>
                <p className="mt-1 text-sm text-gray-700">{p.summary}</p>
                <ul className="mt-2 list-disc pl-5 text-sm">
                  {p.highlights.map((h, i) => (
                    <li key={i}>{h}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
        <section className="md:col-span-2">
          <SectionTitle>Experience</SectionTitle>
          <div className="mt-2 space-y-3">
            {generated.sections.experience.map((e) => (
              <div key={e.id} className="rounded border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <div className="font-medium">{e.role || 'Role'} • {e.company || 'Company'}</div>
                  <div className="text-gray-500">{e.startDate}{e.endDate ? ` – ${e.endDate}` : e.current ? ' – Present' : ''}</div>
                </div>
                <ul className="mt-2 list-disc pl-5 text-sm">
                  {e.achievements.map((a, i) => (
                    <li key={i}>{a}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}

function Contact({ data, colorful = false, invert = false }: { data: ResumeData; colorful?: boolean; invert?: boolean }) {
  const colorBase = invert ? 'text-white' : colorful ? 'text-brand-700' : 'text-gray-700'
  const chip = invert
    ? 'rounded bg-white/10 px-2 py-1 text-xs'
    : colorful
    ? 'rounded bg-brand-50 px-2 py-1 text-xs text-brand-800'
    : 'text-xs'
  return (
    <div className={`mt-1 flex flex-wrap items-center gap-2 ${colorBase}`}>
      {data.basics.email && (
        <a className={chip} href={`mailto:${data.basics.email}`}>{data.basics.email}</a>
      )}
      {data.basics.phone && (
        <a className={chip} href={`tel:${data.basics.phone}`}>{data.basics.phone}</a>
      )}
      {data.basics.location && <span className={chip}>{data.basics.location}</span>}
      {data.basics.linkedin && (
        <a className={chip} href={addProto(data.basics.linkedin)} target="_blank" rel="noreferrer">LinkedIn</a>
      )}
      {data.basics.github && (
        <a className={chip} href={addProto(data.basics.github)} target="_blank" rel="noreferrer">GitHub</a>
      )}
      {data.basics.portfolio && (
        <a className={chip} href={addProto(data.basics.portfolio)} target="_blank" rel="noreferrer">Portfolio</a>
      )}
    </div>
  )
}

function addProto(url: string) {
  if (!/^https?:\/\//i.test(url)) return `https://${url}`
  return url
}
