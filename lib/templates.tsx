import React from 'react'
import { Mail, Phone, Linkedin, Globe, Github } from 'lucide-react'
import type { GeneratedResume, ResumeTemplateKey, ResumeData } from './types'


function formatDateLabel(value?: string): string {
  if (!value) return ''
  const trimmed = value.trim()
  if (!trimmed) return ''
  if (/present/i.test(trimmed)) return 'Present'

  const attempt = Date.parse(trimmed)
  if (!Number.isNaN(attempt)) {
    return new Intl.DateTimeFormat('en', { month: 'short', year: 'numeric' }).format(new Date(attempt))
  }

  const parts = trimmed.split(/[-/\s]+/)
  if (parts.length === 2 && /^\d{4}$/.test(parts[1])) {
    const month = parts[0].slice(0, 3)
    return `${month.charAt(0).toUpperCase()}${month.slice(1).toLowerCase()} ${parts[1]}`
  }

  return trimmed
}

function formatDateRange(start?: string, end?: string, current?: boolean): string {
  const startLabel = formatDateLabel(start)
  const endLabel = current || (!end && startLabel) ? 'Present' : formatDateLabel(end)
  if (!startLabel && !endLabel) return ''
  if (!startLabel) return endLabel
  if (!endLabel) return startLabel
  return `${startLabel} – ${endLabel}`
}
export type ResumeView = 'screen' | 'print'

export function ResumeDocument({ data, generated, view = 'screen' }: { data: ResumeData; generated: GeneratedResume; view?: ResumeView }) {
  const fontClass = data.style?.font === 'serif'
    ? 'font-serif'
    : data.style?.font === 'mono'
    ? 'font-mono'
    : data.style?.font === 'avenir'
    ? ''
    : 'font-sans'
  const accent = data.style?.accent || '#2563eb'
  const Template =
    data.template === 'classic' ? ClassicTemplate : data.template === 'vibrant' ? VibrantTemplate : ModernTemplate
  return (
    <div className={fontClass} style={{ ['--accent' as any]: accent, fontFamily: data.style?.font === 'avenir' ? '"Avenir Next", Avenir, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"' : undefined } as React.CSSProperties}>
      <Template data={data} generated={generated} view={view} />
    </div>
  )
}

function resolveHeadline(data: ResumeData, generated: GeneratedResume): string {
  const explicit = data.basics.headline?.trim()
  if (explicit) return explicit
  const expRole = generated.sections.experience?.[0]?.role?.trim()
  if (expRole) return expRole
  const summary = (generated.sections.summary || data.basics.summary || '').trim()
  if (summary) {
    const firstSentence = summary.split(/[.!?]/)[0]?.trim()
    if (firstSentence && firstSentence.length <= 80) return firstSentence
  }
  return 'Software Professional'
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-sm font-semibold tracking-wider text-gray-700 uppercase" style={{ color: 'var(--accent)' }}>{children}</h3>
}

function ModernTemplate({ data, generated, view = 'screen' }: { data: ResumeData; generated: GeneratedResume; view?: ResumeView }) {
  const skillsList = generated.sections.skills.length ? generated.sections.skills : (data.skills || [])
  const educationList = generated.sections.education.length ? generated.sections.education : (data.education || [])
  const summaryText = generated.sections.summary || data.basics.summary || ''
  const headline = resolveHeadline(data, generated)

  return (
    <div className="relative break-words rounded-lg border bg-white p-6 text-gray-900 shadow">
      {view === 'screen' && (
        <ATSBadge score={generated.atsScore ?? 0} />
      )}
      <header className="border-b pb-4">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--accent)' }}>{data.basics.fullName || 'Your Name'}</h1>
        <p className="text-sm text-gray-700">{headline}</p>
        <Contact data={data} colorful />
      </header>

      <section className="mt-4">
        <SectionTitle>Profile</SectionTitle>
        <p className="mt-1 text-sm leading-relaxed">{summaryText}</p>
      </section>
      {!!generated.sections.experience.length && (
        <section className="mt-4">
          <SectionTitle>Experience</SectionTitle>
          <div className="mt-2 space-y-3">
            {generated.sections.experience.map((e) => (
              <div key={e.id} className="rounded border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <div className="font-medium">{e.role || 'Software Engineer'} • {e.company || 'Company'}</div>
                  <div className="text-gray-500">{formatDateRange(e.startDate, e.endDate, e.current)}</div>
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

      {skillsList.length > 0 && (
        <section className="mt-4">
          <SectionTitle>Skills</SectionTitle>
          <ul className="mt-1 list-disc pl-5 text-sm text-gray-800">
            {skillsList.map((s: string, i: number) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </section>
      )}

      {educationList.length > 0 && (
        <section className="mt-4">
          <SectionTitle>Education</SectionTitle>
          <div className="mt-2 space-y-2 text-sm">
            {educationList.map((ed) => (
              <div key={ed.id || `${ed.school}-${ed.degree}`}>
                <div className="font-medium">{ed.degree}{ed.field ? `, ${ed.field}` : ''} — {ed.school}</div>
                <div className="text-gray-600">
                  {ed.startDate || ''}{ed.endDate ? ` – ${ed.endDate}` : ''}{ed.location ? ` • ${ed.location}` : ''}{ed.grade ? ` • ${ed.grade}` : ''}
                </div>
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
                {p.summary && <p className="mt-1 text-sm text-gray-700">{p.summary}</p>}
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

      {view === 'screen' && typeof generated.atsScore === 'number' && generated.atsScore > 0 && (
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
  const skillsList = generated.sections.skills.length ? generated.sections.skills : (data.skills || [])
  const educationList = generated.sections.education.length ? generated.sections.education : (data.education || [])
  const summaryText = generated.sections.summary || data.basics.summary || ''
  const headline = resolveHeadline(data, generated)
  return (
    <div className="break-words bg-white p-6 text-gray-900">
      <h1 className="text-2xl font-extrabold tracking-tight" style={{ color: 'var(--accent)' }}>{data.basics.fullName || 'Your Name'}</h1>
      <p className="text-sm text-gray-700">{headline}</p>
      <Contact data={data} />

      <hr className="my-3" />
      <h3 className="text-[12px] font-bold uppercase tracking-widest">Professional Summary</h3>
      <p className="mt-1 text-sm leading-relaxed">{summaryText}</p>

      <hr className="my-3" />
      <h3 className="text-[12px] font-bold uppercase tracking-widest">Skills</h3>
      <p className="mt-1 text-sm">{skillsList.join(' • ')}</p>

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

      {educationList.length > 0 && (
        <>
          <hr className="my-3" />
          <h3 className="text-[12px] font-bold uppercase tracking-widest">Education</h3>
          {educationList.map((ed) => (
            <div key={ed.id || `${ed.school}-${ed.degree}`} className="mt-2 text-sm">
              <div className="font-semibold">{ed.degree}{ed.field ? `, ${ed.field}` : ''}</div>
              <div className="text-gray-600">
                {ed.school}
                {(ed.startDate || ed.endDate) ? ` • ${(ed.startDate || '').trim()}${ed.endDate ? ` – ${ed.endDate}` : ''}` : ''}
                {ed.location ? ` • ${ed.location}` : ''}
                {ed.grade ? ` • ${ed.grade}` : ''}
              </div>
            </div>
          ))}
        </>
      )}
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
  const skillsList = generated.sections.skills.length ? generated.sections.skills : (data.skills || [])
  const educationList = generated.sections.education.length ? generated.sections.education : (data.education || [])
  const summaryText = generated.sections.summary || data.basics.summary || ''
  const headline = resolveHeadline(data, generated)
  return (
    <div className="overflow-hidden break-words rounded-lg border bg-white text-gray-900 shadow">
      <div className="px-6 py-5">
        <h1 className="text-3xl font-extrabold tracking-tight" style={{ color: 'var(--accent)' }}>{data.basics.fullName || 'Your Name'}</h1>
        <p className="text-sm text-gray-700">{headline}</p>
        <div className="mt-2 text-xs">
          <Contact data={data} colorful withIcons />
        </div>
        <div className="mt-3 h-px w-full" style={{ backgroundColor: 'var(--accent)' }} />
      </div>
      <div className="grid gap-6 p-6 md:grid-cols-2">
        <section>
          <SectionTitle>Summary</SectionTitle>
          <p className="mt-1 text-sm leading-relaxed">{summaryText}</p>
          <SectionTitle>Skills</SectionTitle>
          <div className="mt-1 flex flex-wrap gap-2">
            {skillsList.map((s, i) => (
              <span key={i} className="rounded-full px-2 py-1 text-xs" style={{ backgroundColor: 'color-mix(in srgb, var(--accent) 15%, white)', color: 'var(--accent)' }}>{s}</span>
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
        {educationList.length > 0 && (
          <section className="md:col-span-2">
            <SectionTitle>Education</SectionTitle>
            <div className="mt-2 space-y-3">
              {educationList.map((ed) => (
                <div key={ed.id || `${ed.school}-${ed.degree}`} className="rounded border p-3">
                  <div className="text-sm font-semibold">{ed.degree}{ed.field ? `, ${ed.field}` : ''}</div>
                  <div className="text-xs text-gray-600">
                    {ed.school}
                    {(ed.startDate || ed.endDate) ? ` • ${(ed.startDate || '').trim()}${ed.endDate ? ` – ${ed.endDate}` : ''}` : ''}
                    {ed.location ? ` • ${ed.location}` : ''}
                    {ed.grade ? ` • ${ed.grade}` : ''}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}

function Contact({ data, colorful = false, invert = false, withIcons = false }: { data: ResumeData; colorful?: boolean; invert?: boolean; withIcons?: boolean }) {
  const colorBase = invert ? 'text-white' : colorful ? 'text-brand-700' : 'text-gray-700'
  const chipBase = invert
    ? 'rounded bg-white/10 px-2 py-1 text-xs'
    : colorful
    ? 'rounded bg-brand-50 px-2 py-1 text-xs text-brand-800'
    : 'text-xs'
  const chips: Array<{ key: string; label: string; href?: string; icon?: React.ReactNode }> = []

  if (data.basics.email) {
    chips.push({ key: 'email', label: data.basics.email, href: `mailto:${data.basics.email}`, icon: <Mail size={12} /> })
  }
  if (data.basics.phone) {
    chips.push({ key: 'phone', label: data.basics.phone, href: `tel:${data.basics.phone}`, icon: <Phone size={12} /> })
  }
  if (data.basics.location) {
    chips.push({ key: 'location', label: data.basics.location })
  }
  if (data.basics.linkedin) {
    chips.push({ key: 'linkedin', label: 'LinkedIn', href: addProto(data.basics.linkedin), icon: <Linkedin size={12} /> })
  }
  if (data.basics.github) {
    chips.push({ key: 'github', label: 'GitHub', href: addProto(data.basics.github), icon: <Github size={12} /> })
  }
  if (data.basics.portfolio) {
    chips.push({ key: 'portfolio', label: 'Portfolio', href: addProto(data.basics.portfolio), icon: <Globe size={12} /> })
  }

  return (
    <div className={`mt-1 flex flex-wrap items-center gap-2 ${colorBase}`}>
      {chips.map((chip) => {
        const className = `${chipBase} ${withIcons ? 'inline-flex items-center gap-1' : ''}`
        const content = (
          <>
            {withIcons && chip.icon}
            <span>{chip.label}</span>
          </>
        )
        if (chip.href) {
          return (
            <a key={chip.key} className={className} href={chip.href} target="_blank" rel="noreferrer">
              {content}
            </a>
          )
        }
        return (
          <span key={chip.key} className={className}>
            {content}
          </span>
        )
      })}
    </div>
  )
}

function addProto(url: string) {
  if (!/^https?:\/\//i.test(url)) return `https://${url}`
  return url
}
