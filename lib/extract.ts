import type { ExperienceItem, ProjectItem, EducationItem } from './types'
import { nanoid, tokenize, unique } from './util'

export interface ParsedResumeBlock {
  id: string
  text: string
  kind: 'heading' | 'bullet' | 'text'
}

export interface ParsedResumeSections {
  summary?: string
  experience: ExperienceItem[]
  projects: ProjectItem[]
  education: EducationItem[]
  skills: string[]
  blocks: ParsedResumeBlock[]
}

const ACTION_VERBS = ['built','developed','designed','implemented','optimized','reduced','increased','improved','led','migrated','launched','architected','engineered','delivered','created','enhanced']
const SUMMARY_HEADINGS = ['summary', 'professional summary', 'profile', 'executive summary', 'objective']
const EXPERIENCE_HEADINGS = ['experience', 'employment', 'professional experience', 'work history', 'work experience']
const PROJECT_HEADINGS = ['projects', 'selected projects', 'project highlights']
const EDUCATION_HEADINGS = ['education', 'academic', 'academics', 'education and certifications', 'certifications', 'training']
const SKILL_HEADINGS = ['skills', 'technical skills', 'core competencies', 'competencies', 'tools', 'technologies']

const DEGREE_PATTERN = /(bachelor|master|mba|b\.sc|m\.sc|b\.tech|m\.tech|b\.eng|m\.eng|ph\.d|bs|ms|ba|ma|bca|mca|associate|diploma|certification)/i
const DATE_RANGE_PATTERN = /((?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+\d{4}|\d{4})(?:\s*[-–—\u2013\u2014]\s*|\s+to\s+|\s+–\s+|\s+—\s+)(present|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+\d{4}|\d{4})/i

export function extractFromResumeText(text: string): ParsedResumeSections {
  const rawLines = text.split(/\r?\n/)
  const trimmed = rawLines.map((l) => l.trim())
  const lines = trimmed.filter(Boolean)
  const blocks = buildRawBlocks(rawLines)
  if (!lines.length) {
    return { summary: undefined, experience: [], projects: [], education: [], skills: [], blocks }
  }

  const sections = segmentByHeading(lines)

  const summary = deriveSummary(sections)
  const experienceSections = filterSections(sections, EXPERIENCE_HEADINGS)
  const projectSections = filterSections(sections, PROJECT_HEADINGS)
  const educationSections = filterSections(sections, EDUCATION_HEADINGS)
  const skillSections = filterSections(sections, SKILL_HEADINGS)

  let experience = experienceSections.flatMap((s) => parseExperience(s.lines))
  let projects = projectSections.flatMap((s) => parseProjects(s.lines))
  let education = educationSections.flatMap((s) => parseEducation(s.lines))
  let skills = parseSkills(skillSections.flatMap((s) => s.lines))

  if (!experience.length) experience = parseExperience(lines)
  if (!projects.length) projects = parseProjects(lines)
  if (!education.length) education = parseEducation(lines)
  if (!skills.length) skills = guessSkillsFromText(text)

  const parsed: ParsedResumeSections = {
    summary,
    experience: enrichExperience(experience),
    projects: enrichProjects(projects),
    education: dedupeEducation(education),
    skills,
    blocks,
  }

  return rebalanceSections(parsed)
}

function buildRawBlocks(rawLines: string[]): ParsedResumeBlock[] {
  const blocks: ParsedResumeBlock[] = []
  let index = 0
  for (const raw of rawLines) {
    const trimmed = raw.trim()
    if (!trimmed) {
      index += 1
      continue
    }
    let kind: ParsedResumeBlock['kind'] = 'text'
    if (isHeading(trimmed)) kind = 'heading'
    else if (isBullet(trimmed)) kind = 'bullet'
    blocks.push({ id: `block-${index++}`, text: trimmed, kind })
  }
  return blocks
}

function segmentByHeading(lines: string[]): { heading: string; lines: string[] }[] {
  const sections: { heading: string; lines: string[] }[] = []
  let current: { heading: string; lines: string[] } = { heading: 'general', lines: [] }

  for (const line of lines) {
    if (isHeading(line)) {
      if (current.lines.length) sections.push(current)
      current = { heading: normalizeHeading(line), lines: [] }
    } else {
      current.lines.push(line)
    }
  }

  if (current.lines.length) sections.push(current)
  return sections
}

function filterSections(sections: { heading: string; lines: string[] }[], keywords: string[]) {
  const pattern = new RegExp(keywords.map(escapeRegex).join('|'), 'i')
  return sections.filter((section) => pattern.test(section.heading))
}

function deriveSummary(sections: { heading: string; lines: string[] }[]): string | undefined {
  const summarySection = sections.find((s) => SUMMARY_HEADINGS.some((h) => s.heading.includes(h)))
  if (summarySection?.lines.length) {
    return clampSummary(summarySection.lines)
  }

  const general = sections.find((s) => s.heading === 'general')
  if (general?.lines.length) {
    return clampSummary(general.lines)
  }
  return undefined
}

function clampSummary(lines: string[]): string {
  const paragraph = lines.join(' ').replace(/\s+/g, ' ').trim()
  return paragraph.split(/(?<=[.!?])\s+/).slice(0, 3).join(' ').slice(0, 600)
}

function parseExperience(lines: string[]): ExperienceItem[] {
  const items: ExperienceItem[] = []
  let current: ExperienceItem | null = null
  let bullets: string[] = []

  const flush = () => {
    if (!current) return
    const achievements = dedupeStrings([...current.achievements, ...bullets])
    if (achievements.length || current.role || current.company) {
      items.push({
        ...current,
        achievements: clampBullets(achievements),
      })
    }
    current = null
    bullets = []
  }

  for (const raw of lines) {
    const line = raw.trim()
    if (!line) continue

    if (isBullet(line)) {
      bullets.push(cleanBullet(line))
      continue
    }

    const job = parseRoleCompanyDates(line)
    if (job) {
      flush()
      current = {
        id: nanoid(),
        role: job.role,
        company: job.company,
        location: job.location,
        startDate: job.startDate,
        endDate: job.endDate,
        current: job.current,
        achievements: job.summary ? [job.summary] : [],
        technologies: job.technologies,
      }
      continue
    }

    if (current && startsWithVerb(line)) {
      bullets.push(cleanBullet(line))
    } else if (!current && startsWithVerb(line)) {
      current = {
        id: nanoid(),
        role: '',
        company: '',
        startDate: '',
        achievements: [cleanBullet(line)],
        technologies: [],
      }
    } else if (current && !current.role && !current.company) {
      current.role = line
    }
  }

  flush()
  return items
}

function parseProjects(lines: string[]): ProjectItem[] {
  const items: ProjectItem[] = []
  let current: ProjectItem | null = null
  let bullets: string[] = []

  const flush = () => {
    if (!current) return
    const highlights = clampBullets(dedupeStrings([...current.highlights, ...bullets]))
    if (current.name || current.summary || highlights.length) {
      items.push({
        ...current,
        highlights,
      })
    }
    current = null
    bullets = []
  }

  for (const raw of lines) {
    const line = raw.trim()
    if (!line) continue

    if (isBullet(line)) {
      bullets.push(cleanBullet(line))
      continue
    }

    if (!current || current.highlights.length || current.summary) {
      flush()
      current = {
        id: nanoid(),
        name: sanitizeProjectName(line),
        summary: '',
        highlights: [],
        technologies: [],
      }
      continue
    }

    if (current && !current.summary) {
      current.summary = line
    } else if (startsWithVerb(line)) {
      bullets.push(cleanBullet(line))
    }
  }

  flush()
  return items
}

function parseEducation(lines: string[]): EducationItem[] {
  const items: EducationItem[] = []
  let current: EducationItem | null = null

  const flush = () => {
    if (!current) return
    if (current.school || current.degree || current.field) {
      items.push(current)
    }
    current = null
  }

  for (const raw of lines) {
    const line = raw.trim()
    if (!line) continue

    if (isHeading(line)) {
      flush()
      continue
    }

    if (isBullet(line)) {
      // treat bullet as additional detail for previous entry (ignored for now)
      continue
    }

    const dateMatch = line.match(DATE_RANGE_PATTERN)
    let startDate = ''
    let endDate = ''
    let currentLine = line
    if (dateMatch) {
      startDate = dateMatch[1]
      endDate = dateMatch[2]
      if (/present/i.test(endDate)) endDate = 'Present'
      currentLine = currentLine.replace(dateMatch[0], '').trim()
    }

    const parts = currentLine.split(/[-•·|•–—]|,|\/|\u2013|\u2014/).map((p) => p.trim()).filter(Boolean)

    const institution = parts.find((p) => containsSchoolKeyword(p)) || parts[0] || ''
    const degreePart = parts.find((p) => DEGREE_PATTERN.test(p)) || parts[1] || ''
    const field = parts.find((p) => /science|engineering|technology|arts|business|management|computer|information|systems|mathematics|finance|law/i.test(p) && p !== institution && p !== degreePart)

    if (!current) {
      current = {
        id: nanoid(),
        school: institution,
        degree: degreePart || institution,
        field: field && field !== degreePart ? field : undefined,
        startDate,
        endDate: endDate && endDate !== startDate ? endDate : undefined,
      }
    } else {
      if (institution && !current.school) current.school = institution
      if (degreePart && !current.degree) current.degree = degreePart
      if (field && !current.field) current.field = field
      if (!current.startDate) current.startDate = startDate
      if (!current.endDate && endDate) current.endDate = endDate
    }
  }

  flush()
  return items
}

function parseSkills(lines: string[]): string[] {
  if (!lines.length) return []
  const buckets = lines.flatMap((line) =>
    line
      .replace(/^[-•▪︎●*\s]+/, '')
      .split(/[,;•\u2022\-|]/)
      .map((entry) => entry.trim())
      .filter(Boolean)
  )
  return dedupeStrings(buckets).slice(0, 40)
}

function guessSkillsFromText(text: string): string[] {
  const tokens = unique(tokenize(text))
  return tokens
    .filter((token) => token.length > 2 && /[a-z]/i.test(token))
    .filter((token) => !/^[0-9]+$/.test(token))
    .slice(0, 40)
}

function enrichExperience(experience: ExperienceItem[]): ExperienceItem[] {
  const seen = new Set<string>()
  return experience.map((item) => {
    const key = `${(item.company || '').toLowerCase()}|${(item.role || '').toLowerCase()}|${(item.startDate || '').toLowerCase()}`
    if (seen.has(key)) return item
    seen.add(key)
    return {
      ...item,
      achievements: clampBullets(dedupeStrings(item.achievements || [])),
      technologies: dedupeStrings(item.technologies || []),
    }
  })
}

function enrichProjects(projects: ProjectItem[]): ProjectItem[] {
  const seen = new Set<string>()
  return projects.map((item) => {
    const key = `${(item.name || '').toLowerCase()}|${(item.summary || '').toLowerCase()}`
    if (seen.has(key)) return item
    seen.add(key)
    return {
      ...item,
      highlights: clampBullets(dedupeStrings(item.highlights || [])),
      technologies: dedupeStrings(item.technologies || []),
    }
  })
}

function dedupeEducation(list: EducationItem[]): EducationItem[] {
  const seen = new Set<string>()
  const out: EducationItem[] = []
  for (const item of list) {
    const key = `${(item.school || '').toLowerCase()}|${(item.degree || '').toLowerCase()}|${(item.startDate || '').toLowerCase()}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(item)
  }
  return out
}

function rebalanceSections(parsed: ParsedResumeSections): ParsedResumeSections {
  const infoKeywords = /(linkedin|github|portfolio|behance|dribbble|certification|certifications|award|achievement|online presence|contact|https?:)/i
  const extraSummary: string[] = []
  const cleanedProjects: ProjectItem[] = []

  for (const project of parsed.projects) {
    const blob = [project.name, project.summary, ...(project.highlights || [])].join(' ').trim()
    const hasStructuredHighlights = project.highlights && project.highlights.length > 1
    if (!hasStructuredHighlights && infoKeywords.test(blob)) {
      extraSummary.push(blob)
    } else {
      cleanedProjects.push(project)
    }
  }

  const filteredExperience: ExperienceItem[] = []
  for (const item of parsed.experience) {
    const blob = [item.role, item.company, ...(item.achievements || [])].join(' ').trim()
    if (!item.role && !item.company && (item.achievements || []).length <= 1 && infoKeywords.test(blob)) {
      extraSummary.push(blob)
      continue
    }
    filteredExperience.push(item)
  }

  const extraSkills = extraSummary.flatMap((chunk) =>
    chunk
      .split(/[,•|\u2022]/)
      .map((s) => s.trim())
      .filter((s) => s && s.length <= 60 && !/https?:/i.test(s))
  )

  const summaryPieces = [parsed.summary?.trim(), ...extraSummary]
    .filter(Boolean)
    .map((s) => s!.replace(/\b(?:linkedin|github|portfolio|online presence)\b:?/gi, '').trim())

  const summarySentences: string[] = []
  const summarySeen = new Set<string>()
  for (const piece of summaryPieces) {
    const fragments = piece.split(/(?<=[.!?])\s+/)
    for (const fragment of fragments) {
      const trimmed = fragment.trim()
      if (!trimmed) continue
      const key = normalizeKey(trimmed)
      if (summarySeen.has(key)) continue
      summarySeen.add(key)
      summarySentences.push(trimmed)
    }
  }

  const mergedSummary = summarySentences.join(' ').trim()

  const seenStatements = new Set<string>(summarySentences.map((s) => normalizeKey(s)))

  const cleanedExperience = filteredExperience.map((item) => {
    const uniqueAch: string[] = []
    for (const ach of item.achievements || []) {
      const trimmed = ach.trim()
      if (!trimmed) continue
      const key = normalizeKey(trimmed)
      if (seenStatements.has(key)) continue
      seenStatements.add(key)
      uniqueAch.push(trimmed)
    }
    return {
      ...item,
      achievements: dedupeStrings(uniqueAch),
    }
  })

  const contactPattern = /(@|mailto:|https?:|linkedin|github|gmail|phone|\+\d{2,}|resume_|cv_)/i
  const filteredCleanExperience = cleanedExperience.filter((item) => {
    const header = `${item.role || ''} ${item.company || ''}`.trim()
    const combined = `${header} ${item.achievements.join(' ')}`.trim()
    const headerKey = normalizeKey(header)
    const combinedKey = normalizeKey(combined)

    if (!combinedKey) return false
    if (!item.achievements.length && headerKey && summarySeen.has(headerKey)) return false
    if (contactPattern.test(combined) && item.achievements.length <= 1) return false
    if (seenStatements.has(combinedKey)) return false
    seenStatements.add(combinedKey)
    return true
  })

  const mergedExperienceByKey = new Map<string, ExperienceItem>()
  for (const item of filteredCleanExperience) {
    const key = [normalizeKey(item.role || ''), normalizeKey(item.company || ''), normalizeDateKey(item.startDate), normalizeDateKey(item.endDate)].join('|')
    if (!key.trim()) continue
    const existing = mergedExperienceByKey.get(key)
    if (!existing) {
      mergedExperienceByKey.set(key, { ...item, achievements: [...(item.achievements || [])] })
      continue
    }
    const combinedAchievements = dedupeStrings((existing.achievements || []).concat(item.achievements || []))
    mergedExperienceByKey.set(key, {
      ...existing,
      startDate: existing.startDate || item.startDate,
      endDate: existing.endDate || item.endDate,
      achievements: combinedAchievements,
      technologies: dedupeStrings((existing.technologies || []).concat(item.technologies || [])),
    })
  }

  const mergedExperience = Array.from(mergedExperienceByKey.values())
    .map((item) => ({
      ...item,
      achievements: dedupeStrings((item.achievements || []).filter(Boolean)),
    }))
    .filter((item) => item.role || item.company)

  const cleanedSkills = dedupeStrings(parsed.skills.concat(extraSkills))
    .filter((skill) => {
      const key = normalizeKey(skill)
      if (!key) return false
      if (seenStatements.has(key)) return false
      seenStatements.add(key)
      return true
    })
    .slice(0, 40)

  return {
    summary: mergedSummary || parsed.summary,
    experience: mergedExperience,
    projects: cleanedProjects,
    education: parsed.education,
    skills: cleanedSkills,
    blocks: parsed.blocks,
  }
}

function parseRoleCompanyDates(line: string) {
  const cleaned = line.replace(/\s+/g, ' ').trim()
  if (!cleaned) return null

  const dateMatch = cleaned.match(DATE_RANGE_PATTERN)
  let startDate = ''
  let endDate = ''
  let current = false
  let remainder = cleaned
  if (dateMatch) {
    startDate = dateMatch[1]
    endDate = dateMatch[2]
    current = /present/i.test(endDate)
    if (current) endDate = ''
    remainder = remainder.replace(dateMatch[0], '').trim()
  }

  const atSplit = remainder.split(/\s+at\s+/i)
  let role = ''
  let company = ''
  if (atSplit.length === 2) {
    role = atSplit[0].trim()
    company = atSplit[1].trim()
  } else {
    const parts = remainder.split(/\s[|•·\-–—]\s|\s{2,}/).map((p) => p.trim()).filter(Boolean)
    if (parts.length >= 2) {
      const first = parts[0]
      const second = parts[1]
      if (likelyCompany(first) && !likelyCompany(second)) {
        company = first
        role = second
      } else if (!likelyCompany(first) && likelyCompany(second)) {
        role = first
        company = second
      } else {
        role = first
        company = second
      }
    } else {
      role = remainder
    }
  }

  return {
    role,
    company,
    location: extractLocation(remainder),
    startDate,
    endDate,
    current,
    summary: '',
    technologies: extractTechnologies(remainder),
  }
}

function extractLocation(line: string): string | undefined {
  const match = line.match(/\b([A-Z][a-zA-Z]+,\s*[A-Z]{2}|[A-Z][a-z]+\s+[A-Z][a-z]+)\b/)
  return match ? match[0] : undefined
}

function extractTechnologies(line: string): string[] {
  const tokens = tokenize(line)
  return unique(tokens.filter((t) => /^(react|next|node|typescript|javascript|python|java|aws|azure|gcp|docker|kubernetes|graphql|tailwind|redux|postgres|mysql|c\+\+|c#|go|scala|php|swift)$/.test(t)))
}

function isHeading(line: string): boolean {
  if (!line) return false
  const normalized = line.replace(/[:*]+$/, '').trim()
  if (!normalized) return false
  if (normalized.length <= 3) return false
  const lower = normalized.toLowerCase()
  if ([...SUMMARY_HEADINGS, ...EXPERIENCE_HEADINGS, ...PROJECT_HEADINGS, ...EDUCATION_HEADINGS, ...SKILL_HEADINGS].some((kw) => lower.includes(kw))) {
    return true
  }
  return normalized.length <= 48 && /^[A-Z0-9&\s]+$/.test(normalized)
}

function normalizeHeading(line: string) {
  return line.replace(/[:*]+$/, '').trim().toLowerCase()
}

function isBullet(line: string) {
  if (/^[-•▪︎●*]/.test(line)) return true
  return ACTION_VERBS.some((verb) => line.toLowerCase().startsWith(verb))
}

function cleanBullet(line: string) {
  return line.replace(/^[-•▪︎●*\s]+/, '').trim()
}

function startsWithVerb(line: string) {
  return ACTION_VERBS.some((verb) => line.toLowerCase().startsWith(verb))
}

function clampBullets(list: string[]): string[] {
  return list.filter(Boolean).slice(0, 6)
}

function dedupeStrings(list: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const item of list) {
    const trimmed = item.trim()
    if (!trimmed) continue
    const key = trimmed.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(trimmed)
  }
  return out
}


function normalizeKey(value: string): string {
  return value.replace(/\s+/g, ' ').trim().toLowerCase()
}

function normalizeDateKey(value?: string): string {
  if (!value) return ''
  return value.trim().toLowerCase()
}

function likelyCompany(text: string): boolean {
  const lower = text.toLowerCase()
  return /(inc|llc|ltd|corp|corporation|company|technologies|solutions|labs|studio|bank|group|systems|consulting|university|college|institute)/.test(lower)
}

function containsSchoolKeyword(text: string): boolean {
  return /(university|college|school|academy|institute|polytechnic|instituto|universidad|université)/i.test(text)
}

function sanitizeProjectName(line: string) {
  return line.replace(/^[•\-\d.\s]+/, '').trim()
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
