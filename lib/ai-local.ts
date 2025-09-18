import { unique, tokenize, nanoid, filterSkillList, sanitizeNarrative } from './util'
import { extractFromResumeText } from './extract'
import type { GeneratedResume, ResumeData, ExperienceItem, ProjectItem, EducationItem } from './types'

// Lightweight heuristic generator. Used as a fallback when the OpenAI API is unavailable.
export async function generateLocalResumeDraft(data: ResumeData): Promise<GeneratedResume> {
  const jd = (data.attachments.jobDescriptionText || '').slice(0, 50_000)
  const goals = data.instructions.goals.join(' ')

  const jdTokens = tokenize(jd)
  const goalTokens = tokenize(goals)
  const techs = unique(
    (data.experience.flatMap((e) => e.technologies || []) as string[])
      .concat(data.projects.flatMap((p) => p.technologies || []))
      .map((t) => t.toLowerCase())
  )

  // Build a richer resume token set from user content (tech, achievements, highlights)
  const expText = (data.experience.flatMap((e) => e.achievements || []) as string[]).join(' ')
  const projText = (data.projects.flatMap((p) => (p.highlights || []).concat(p.summary || '')) as string[]).join(' ')
  const resumeTokens = new Set<string>([...techs, ...tokenize(expText), ...tokenize(projText)])
  const jdSet = new Set<string>([...jdTokens, ...tokenize((data.instructions.keywords || []).join(' '))])
  const matchedKeywords = unique([...jdSet].filter((t) => resumeTokens.has(t)))
  const denom = Math.max(5, Math.min(30, jdSet.size))
  const atsScore = jdSet.size ? Math.min(100, Math.round((matchedKeywords.length / denom) * 100)) : undefined

  const fallbackSummary = buildSummary(data, matchedKeywords, goalTokens)
  // Build skills list:
  // - If user uploaded resume / provided tech arrays, prefer those over JD tokens
  // - Keep concise, tech-looking tokens only
  const techFromUser = unique(
    (data.experience.flatMap((e) => e.technologies || []) as string[])
      .concat(data.projects.flatMap((p) => p.technologies || []))
  )
  const providedSkills = (data.skills || []).map((s) => s.trim()).filter(Boolean)
  const skillPool = (providedSkills.length ? providedSkills : techFromUser.concat(matchedKeywords))
    .map((t) => t.trim())
    .filter((t) => t && t.length >= 2 && !/\s{2,}/.test(t))
    .map((t) => t.replace(/[,.;:]+$/, ''))

  const baseSkills = filterSkillList(skillPool, data.basics)

  // Light touch enrichment of bullet points using JD cues.
  const enrich = (text: string) =>
    text.replace(/\b(optimized|reduced|improved|increased)\b/gi, (m: string) => m.toUpperCase())

  // Prefer parsed experience/projects from existing resume when available
  let parsedSummary: string | undefined
  let parsedExp: ExperienceItem[] = []
  let parsedProj: ProjectItem[] = []
  let parsedEdu: EducationItem[] = []
  let parsedSkills: string[] = []
  const resumeText = data.attachments.existingResumeText
  const hasTextResume = Boolean(resumeText)
  if (resumeText) {
    try {
      const parsed = extractFromResumeText(resumeText)
      parsedSummary = parsed.summary
      parsedExp = parsed.experience
      parsedProj = parsed.projects
      parsedEdu = parsed.education
      parsedSkills = parsed.skills
    } catch {}
  }

  const hasUploadedResume = hasTextResume
  const preserveUserText = hasUploadedResume && (data.experience.length > 0 || data.projects.length > 0)
  const strict = Boolean((data as any).preserveStrict)

  const experience = (data.experience.length ? data.experience : parsedExp).map((e) => ({
    ...e,
      achievements: (preserveUserText
      ? (strict ? e.achievements.map((a) => cleanSentence(a)) : e.achievements.map((a) => (shouldRewrite(a) ? rewriteLine(a, jdSet, e.technologies || []) : cleanSentence(a))))
      : normalizeBullets(e.achievements, jdSet, e.technologies || []).map(enrich)
    ).filter(Boolean),
  }))

  const projects = (data.projects.length ? data.projects : parsedProj).map((p) => ({
    ...p,
      highlights: (preserveUserText
      ? (strict
          ? (p.highlights.length ? p.highlights : [p.summary || '']).map((h) => cleanSentence(h))
          : (p.highlights.length ? p.highlights : [p.summary || '']).map((h) => (shouldRewrite(h) ? rewriteLine(h, jdSet, p.technologies || []) : cleanSentence(h)))
        )
      : normalizeBullets(p.highlights.length ? p.highlights : [p.summary || ''], jdSet, p.technologies || []).map(enrich)
    ).filter(Boolean),
  }))

  const education = (data.education && data.education.length ? data.education : parsedEdu).map((ed) => ({
    ...ed,
    id: ed.id || nanoid(),
  }))

  const mergedExperience = mergeProjectsIntoExperience(experience, projects)
  const cleanedExperience = mergedExperience.map((entry) => ({
    ...entry,
    achievements: tidyBullets(entry.achievements || []),
  }))

  const skillList = filterSkillList(
    unique([
      ...baseSkills,
      ...parsedSkills,
      ...(data.skills || []),
    ]),
    data.basics,
  ).slice(0, 20)

  const finalSummary = sanitizeNarrative((data.basics.summary?.trim() || parsedSummary || '').trim() || fallbackSummary, data.basics, 280)

  return {
    sections: { summary: finalSummary, skills: skillList, experience: cleanedExperience, projects: [], education },
    atsScore,
    matchedKeywords,
  }
}

function buildSummary(data: ResumeData, matchedKeywords: string[], goals: string[]): string {
  const name = data.basics.fullName || 'Candidate'
  const years = estimateYears(data)
  const role = data.basics.headline || 'Software Engineer'
  const top = matchedKeywords.slice(0, 5)
  const strengths = top.length ? `Specializes in ${top.join(', ')}.` : ''
  const visa = (data.basics.workAuth && (data.basics.workAuth as any).status) || ''
  const visaText = visa && visa !== 'Not Applicable' ? ` Work authorization: ${visa}.` : ''

  const yearsPart = years >= 1 ? ` with ${years}+ years` : ''
  // Do not echo user instructions/prompt verbatim; keep a neutral, professional line
  const sentence = `${role}${yearsPart} building scalable, user-centric applications. ${strengths}`.trim()
  const final = `${sentence}${visaText}`
  return final
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

function normalizeBullets(raw: string[], jd: Set<string>, techHint: string[] = []): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  const stop = new Set(['and', 'or', 'the', 'with', 'for', 'to'])
  const verbs = ['Built', 'Developed', 'Implemented', 'Architected', 'Optimized', 'Improved']
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
    // prepend action verb if missing
    if (!/^(built|developed|implemented|architected|optimized|improved|designed)/i.test(s)) {
      const v = verbs[(Math.random() * verbs.length) | 0]
      s = `${v} ${s}`
    }
    // add tech hint when relevant
    const tech = (techHint || []).slice(0, 3).filter(Boolean)
    if (tech.length && !/using/i.test(s)) {
      s = `${s} using ${tech.join(', ')}`
    }
    return s
  }

  for (const line of raw) {
    if (!line) continue
    const cleaned = pick(line)
    if (!cleaned) continue
    const key = cleaned.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(cleaned)
  }

  return out.slice(0, 5)
}

function shouldRewrite(line: string): boolean {
  if (!line) return false
  const lc = line.toLowerCase()
  if (/lorem ipsum|dummy text|add here/.test(lc)) return true
  if (lc.length < 30) return true
  return false
}

function rewriteLine(line: string, jd: Set<string>, techHint: string[] = []): string {
  const tokens = tokenize(line).filter((t) => t.length > 2)
  const jdTokens = [...jd]
  const tech = techHint.slice(0, 3).filter(Boolean)
  const merged = unique(tokens.concat(jdTokens).concat(tech))
  const verbs = ['Delivered', 'Drove', 'Optimized', 'Implemented', 'Elevated']
  const verb = verbs[(Math.random() * verbs.length) | 0]
  const top = merged.slice(0, 5).join(', ')
  return `${verb} outcomes around ${top}`
}

function cleanSentence(line: string): string {
  return line.replace(/\s+/g, ' ').replace(/[•\u2022]+/g, '').trim()
}

function dedupeStrings(values: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const value of values) {
    const trimmed = value.trim()
    if (!trimmed) continue
    const key = trimmed.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(trimmed)
  }
  return out
}

function mergeProjectsIntoExperience(exp: ExperienceItem[], projects: ProjectItem[]): ExperienceItem[] {
  if (!projects.length) return exp
  if (!exp.length) {
    return projects.map((p) => ({
      id: p.id || nanoid(),
      role: p.name || 'Project',
      company: '',
      startDate: '',
      endDate: '',
      achievements: (p.highlights && p.highlights.length ? p.highlights : [p.summary || '']).filter(Boolean),
      technologies: p.technologies,
    }))
  }

  const out = exp.map((item) => ({
    ...item,
    achievements: dedupeStrings((item.achievements || []).map((a) => a.trim()).filter(Boolean)),
  }))

  const normalize = (value: string) => value.replace(/\s+/g, ' ').trim().toLowerCase()
  const target = out[0]
  const seen = new Set(target.achievements.map((a) => normalize(a)))

  for (const project of projects) {
    const highlights = (project.highlights && project.highlights.length ? project.highlights : [project.summary || ''])
      .map((h) => h.trim())
      .filter(Boolean)
    if (!highlights.length) continue
    const entry = `Project: ${project.name || 'Project'} — ${highlights.join('; ')}`
    const key = normalize(entry)
    if (seen.has(key)) continue
    seen.add(key)
    target.achievements.push(entry)
  }

  return out
}

function tidyBullets(lines: string[]): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (const line of lines) {
    if (!line) continue
    const normalized = line.replace(/\s+/g, ' ').trim()
    if (!normalized) continue

    let candidates: string[] = [normalized]
    if (/[•▪●·;]/.test(normalized)) {
      candidates = normalized.split(/[•▪●·;]+/)
    } else if (normalized.length > 160) {
      candidates = normalized.split(/\.\s+(?=[A-Z])/)
    }

    for (let candidate of candidates) {
      candidate = candidate.replace(/\s+/g, ' ').trim()
      if (!candidate) continue
      if (!/^[A-Z]/.test(candidate)) {
        candidate = candidate.charAt(0).toUpperCase() + candidate.slice(1)
      }
      if (!/[.!?]$/.test(candidate)) candidate += '.'
      const key = candidate.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      out.push(candidate)
      if (out.length >= 6) break
    }
    if (out.length >= 6) break
  }
  return out
}
