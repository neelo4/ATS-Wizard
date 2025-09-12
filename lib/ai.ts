import { unique, tokenize, nanoid } from './util'
import { extractFromResumeText } from './extract'
import type { GeneratedResume, ResumeData } from './types'

// Simple, local heuristic AI stub. Can be swapped with real LLMs via API.
export async function generateResumeDraft(data: ResumeData): Promise<GeneratedResume> {
  const jd = (data.attachments.jobDescriptionText || '').slice(0, 50_000)
  const resume = (data.attachments.existingResumeText || '').slice(0, 50_000)
  const goals = data.instructions.goals.join(' ')

  const jdTokens = tokenize(jd)
  const goalTokens = tokenize(goals)
  const techs = unique(
    (data.experience.flatMap((e) => e.technologies || []) as string[])
      .concat(data.projects.flatMap((p) => p.technologies || []))
      .map((t) => t.toLowerCase())
  )

  const matchedKeywords = unique(jdTokens.filter((t) => techs.includes(t)))
  const atsScore = Math.min(100, Math.round((matchedKeywords.length / Math.max(techs.length, 1)) * 100))

  const summary = buildSummary(data, matchedKeywords)
  const skills = unique([...matchedKeywords, ...goalTokens]).slice(0, 20)

  // Light touch enrichment of bullet points using JD cues.
  const cue = new Set(jdTokens)
  const enrich = (text: string) =>
    text.replace(/\b(optimized|reduced|improved|increased)\b/gi, (m: string) => m.toUpperCase())

  // Prefer parsed experience/projects from existing resume when available
  let parsedExp: any[] = []
  let parsedProj: any[] = []
  if (!data.experience.length && !data.projects.length && data.attachments.existingResumeText) {
    try {
      const parsed = extractFromResumeText(data.attachments.existingResumeText)
      parsedExp = parsed.experience
      parsedProj = parsed.projects
    } catch {}
  }

  const jdSet = new Set(jdTokens)

  let experience = (data.experience.length ? data.experience : parsedExp).map((e) => ({
    ...e,
    achievements: normalizeBullets(e.achievements, jdSet).map(enrich),
  }))

  let projects = (data.projects.length ? data.projects : parsedProj).map((p) => ({
    ...p,
    highlights: normalizeBullets(p.highlights.length ? p.highlights : [p.summary], jdSet).map(enrich),
  }))

  // Do not auto-synthesize sections; only use user/parsed content

  return {
    sections: { summary, skills, experience, projects },
    atsScore,
    matchedKeywords,
  }
}

function buildSummary(data: ResumeData, matchedKeywords: string[]): string {
  const name = data.basics.fullName || 'Candidate'
  const years = estimateYears(data)
  const role = data.basics.headline || 'Software Engineer'
  const top = matchedKeywords.slice(0, 5)
  const goals = data.instructions.goals.join(', ')

  const parts = [
    `${name} — ${years}+ years as ${role}.`,
    top.length ? `Strong with ${top.join(', ')}.` : '',
    goals ? `Focus: ${goals}.` : '',
  ].filter(Boolean)
  return parts.join(' ')
}

function estimateYears(data: ResumeData): number {
  const starts = data.experience
    .map((e) => Date.parse(e.startDate))
    .filter((n) => !Number.isNaN(n))
  if (!starts.length) return 0
  const earliest = Math.min(...starts)
  const years = (Date.now() - earliest) / (1000 * 60 * 60 * 24 * 365)
  return Math.max(0, Math.round(years))
}

function normalizeBullets(raw: string[], jd: Set<string>): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  const stop = new Set(['and', 'or', 'the', 'with', 'for', 'to'])
  const pick = (line: string) => {
    // split on common separators
    let parts = line.split(/[•\u2022\-–—;]|\.\s+/).map((s) => s.trim()).filter(Boolean)
    if (!parts.length) parts = [line]
    // choose fragment with most JD overlap
    let best = parts[0]
    let bestScore = -1
    for (const p of parts) {
      const tokens = p.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean)
      const score = tokens.reduce((acc, t) => acc + (jd.has(t) ? 1 : 0), 0)
      if (score > bestScore) { best = p; bestScore = score }
    }
    // cleanup
    let s = best
      .replace(/https?:[^\s)]+/g, '')
      .replace(/\s{2,}/g, ' ')
      .trim()
    // limit to ~18 words
    const words = s.split(/\s+/)
    if (words.length > 18) s = words.slice(0, 18).join(' ')
    // capitalize and end with period
    s = s.charAt(0).toUpperCase() + s.slice(1)
    if (!/[.!?]$/.test(s)) s += '.'
    return s
  }

  for (const r of raw) {
    const s = pick(r)
    if (s && !seen.has(s.toLowerCase())) {
      seen.add(s.toLowerCase())
      out.push(s)
    }
    if (out.length >= 5) break
  }
  return out
}
