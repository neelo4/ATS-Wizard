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
    text.replace(/\b(optimized|reduced|improved|increased)\b/gi, (m) => m.toUpperCase())

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

  let experience = (data.experience.length ? data.experience : parsedExp).map((e) => ({
    ...e,
    achievements: e.achievements
      .map((a) => (a.trim().length ? a : ''))
      .filter(Boolean)
      .map((a) =>
        a +
        (Array.from(cue).some((k) => a.toLowerCase().includes(k))
          ? ' — aligned with role requirements'
          : '')
      )
      .map(enrich),
  }))

  let projects = (data.projects.length ? data.projects : parsedProj).map((p) => ({
    ...p,
    highlights: p.highlights.map(enrich),
  }))

  // Synthesize minimal content if user provided none.
  if (!experience.length) {
    const top = matchedKeywords.slice(0, 4)
    experience = [
      {
        id: nanoid(),
        role: data.basics.headline || 'Software Engineer',
        company: 'Independent / Freelance',
        startDate: new Date().getFullYear().toString(),
        achievements: [
          `Built and shipped features using ${top.join(', ') || 'modern web technologies'}.`,
          'Collaborated with stakeholders to deliver user-focused outcomes.',
        ],
        technologies: top,
      },
    ]
  }

  if (!projects.length) {
    const top = matchedKeywords.slice(0, 5)
    projects = [
      {
        id: nanoid(),
        name: 'Portfolio Project',
        url: '',
        summary:
          top.length
            ? `End-to-end application highlighting ${top.join(', ')} with emphasis on performance and DX.`
            : 'End-to-end application demonstrating core full‑stack skills and clean architecture.',
        highlights: [
          'Designed clean, modular components and reusable hooks.',
          'Implemented testing and CI for reliable delivery.',
        ],
        technologies: top,
      },
    ]
  }

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
