import type { GeneratedResume, ResumeData, ExperienceItem, ProjectItem, EducationItem, BasicDetails } from './types'
import { generateLocalResumeDraft } from './ai-local'
import { nanoid, collectContactTokens, filterSkillList, sanitizeNarrative, textContainsToken, containsContactNoise } from './util'
import { extractFromResumeText, type ParsedResumeSections } from './extract'

type AiResponse = {
  sections: GeneratedResume['sections']
  atsScore?: number
  matchedKeywords?: string[]
}

const DEFAULT_MODEL = 'gpt-4o-mini'

export async function generateResumeDraft(data: ResumeData): Promise<GeneratedResume> {
  try {
    const key = process.env.OPENAI_API_KEY
    if (!key) {
      console.warn('[ai] OPENAI_API_KEY missing – using local heuristic generator')
      return await generateLocalResumeDraft(data)
    }

    const model = process.env.OPENAI_MODEL || DEFAULT_MODEL
    const prompt = buildPrompt(data)
    const body = {
      model,
      messages: [
        {
          role: 'system',
          content:
            'You are an expert technical resume writer. You craft concise, results-oriented resume sections that align tightly with the provided job description, goals, and candidate history.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.6,
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'generated_resume',
          schema: resumeSchema,
        },
      },
    }

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const err = await safeJson(res)
      throw new Error(err?.error?.message || `OpenAI request failed with status ${res.status}`)
    }

    const payload = (await res.json()) as any
    const content = payload?.choices?.[0]?.message?.content
    if (!content || typeof content !== 'string') {
      throw new Error('OpenAI response missing JSON content')
    }

    const parsed = JSON.parse(content) as AiResponse
    const normalized = normalizeResponse(parsed, data)
    return normalized
  } catch (err) {
    console.error('[ai] OpenAI generation failed – using local heuristic generator', err)
    return await generateLocalResumeDraft(data)
  }
}

const experienceSchema = {
  type: 'object',
  required: ['role', 'company', 'startDate', 'achievements'],
  additionalProperties: false,
  properties: {
    id: { type: 'string' },
    role: { type: 'string' },
    company: { type: 'string' },
    location: { type: 'string' },
    startDate: { type: 'string' },
    endDate: { type: 'string' },
    current: { type: 'boolean' },
    achievements: {
      type: 'array',
      items: { type: 'string' },
      minItems: 2,
      maxItems: 6,
    },
    technologies: {
      type: 'array',
      items: { type: 'string' },
      maxItems: 8,
    },
  },
} as const

const projectSchema = {
  type: 'object',
  required: ['name', 'summary', 'highlights'],
  additionalProperties: false,
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    url: { type: 'string' },
    summary: { type: 'string' },
    highlights: {
      type: 'array',
      items: { type: 'string' },
      minItems: 1,
      maxItems: 5,
    },
    technologies: {
      type: 'array',
      items: { type: 'string' },
      maxItems: 8,
    },
  },
} as const

const educationSchema = {
  type: 'object',
  required: ['school', 'degree'],
  additionalProperties: false,
  properties: {
    id: { type: 'string' },
    school: { type: 'string' },
    degree: { type: 'string' },
    field: { type: 'string' },
    startDate: { type: 'string' },
    endDate: { type: 'string' },
    location: { type: 'string' },
    grade: { type: 'string' },
  },
} as const

const resumeSchema = {
  type: 'object',
  required: ['sections'],
  additionalProperties: false,
  properties: {
    sections: {
      type: 'object',
      required: ['summary', 'skills', 'experience', 'projects', 'education'],
      additionalProperties: false,
      properties: {
        summary: { type: 'string' },
        skills: {
          type: 'array',
          items: { type: 'string' },
          maxItems: 15,
        },
        experience: {
          type: 'array',
          items: experienceSchema,
          maxItems: 6,
        },
        projects: {
          type: 'array',
          items: projectSchema,
          maxItems: 6,
        },
        education: {
          type: 'array',
          items: educationSchema,
          maxItems: 5,
        },
      },
    },
    atsScore: { type: 'integer', minimum: 0, maximum: 100 },
    matchedKeywords: {
      type: 'array',
      items: { type: 'string' },
      maxItems: 30,
    },
  },
} as const

function normalizeResponse(res: AiResponse, source: ResumeData): GeneratedResume {
  const sections = res.sections || { summary: '', skills: [], experience: [], projects: [], education: [], blocks: [] }

  const parsedFromResume = safeExtract(source.attachments?.existingResumeText)

  const sourceSummary = source.basics.summary?.trim() || parsedFromResume.summary

  const sourceExperience = Array.isArray(source.experience) && source.experience.length
    ? source.experience
    : parsedFromResume.experience

  const sourceProjects = Array.isArray(source.projects) && source.projects.length
    ? source.projects
    : parsedFromResume.projects

  const sourceEducation = Array.isArray(source.education) && source.education.length
    ? source.education
    : parsedFromResume.education

  const sourceSkills = Array.isArray(source.skills) && source.skills.length
    ? source.skills
    : parsedFromResume.skills

  const shouldRewrite = shouldFavorRewrite(source)

  const keyedSourceExperience = buildKeyedMap(sourceExperience, experienceKey)
  const experienceDraft = (sections.experience || []).map((entry) => {
    const original = entry.id ? keyedSourceExperience.get(entry.id) || keyedSourceExperience.get(experienceKey(entry)) : keyedSourceExperience.get(experienceKey(entry))
    const merged: ExperienceItem = {
      ...original,
      ...entry,
      id: entry.id || original?.id || nanoid(),
      role: entry.role || original?.role || '',
      company: entry.company || original?.company || '',
      location: entry.location || original?.location,
      startDate: entry.startDate || original?.startDate || '',
      endDate: entry.endDate || original?.endDate,
      current: typeof entry.current === 'boolean' ? entry.current : original?.current,
      technologies: mergeStringArrays(original?.technologies || [], entry.technologies || []),
      achievements: blendGeneratedText(original?.achievements || [], entry.achievements || [], { preferGenerated: shouldRewrite }),
    }
    return merged
  })

  const keyedSourceProjects = buildKeyedMap(sourceProjects, projectKey)
  const projectsDraft = (sections.projects || []).map((entry) => {
    const original = entry.id ? keyedSourceProjects.get(entry.id) || keyedSourceProjects.get(projectKey(entry)) : keyedSourceProjects.get(projectKey(entry))
    const merged: ProjectItem = {
      ...original,
      ...entry,
      id: entry.id || original?.id || nanoid(),
      name: entry.name || original?.name || '',
      summary: pickSummary(entry.summary, original?.summary, shouldRewrite),
      url: entry.url || original?.url,
      technologies: mergeStringArrays(original?.technologies || [], entry.technologies || []),
      highlights: blendGeneratedText(original?.highlights || [], entry.highlights || [], { preferGenerated: shouldRewrite }),
    }
    return merged
  })

  const keyedSourceEducation = buildKeyedMap(sourceEducation, educationKey)
  const educationDraft = (sections.education || []).map((entry) => {
    const original = entry.id ? keyedSourceEducation.get(entry.id) || keyedSourceEducation.get(educationKey(entry)) : keyedSourceEducation.get(educationKey(entry))
    const merged: EducationItem = {
      ...original,
      ...entry,
      id: entry.id || original?.id || nanoid(),
      school: entry.school || original?.school || '',
      degree: entry.degree || original?.degree || '',
      field: entry.field || original?.field,
      startDate: entry.startDate || original?.startDate,
      endDate: entry.endDate || original?.endDate,
      location: entry.location || original?.location,
      grade: entry.grade || original?.grade,
    }
    return merged
  })

  const experience = ensureAllExperience(experienceDraft, sourceExperience)
  const projects = ensureAllProjects(projectsDraft, sourceProjects)
  const education = ensureAllEducation(educationDraft, sourceEducation)
  const cleanedEducation = normalizeEducationOutput(education, sourceEducation)

  const contactTokens = collectContactTokens(source.basics)
  const finalSummary = cleanSummaryText(sections.summary, sourceSummary, contactTokens)
  const cleanedProjects = sanitizeProjectEntries(projects, source.basics, contactTokens)
  const mergedExperience = mergeProjectsIntoExperience(experience, cleanedProjects)
  const consolidatedExperience = consolidateExperienceEntries(mergedExperience)
  const dedupedExperience = pruneDuplicateExperienceContent(consolidatedExperience, finalSummary, contactTokens)
  const uniqueExperience = dedupeExperienceCards(dedupedExperience)
  const globalAchievementKeys = new Set<string>()
  const cleanedExperience = uniqueExperience.map((entry) => {
    const bullets = tidyBullets(entry.achievements || [], contactTokens).filter((line) => {
      const key = normalizeKey(line)
      if (!key) return false
      if (globalAchievementKeys.has(key)) return false
      globalAchievementKeys.add(key)
      return true
    })
    return {
      ...entry,
      achievements: bullets,
    }
  }).filter((entry) => entry.achievements.length > 0 && !shouldDropExperienceEntry(entry, contactTokens))

  const combinedSkills = combineSkills(sections.skills || [], sourceSkills, source.basics)

  return {
    sections: {
      summary: finalSummary,
      skills: combinedSkills,
      experience: cleanedExperience,
      projects: cleanedProjects,
      education: cleanedEducation,
    },
    atsScore: clampScore(res.atsScore),
    matchedKeywords: dedupeStrings((res.matchedKeywords || []).map((s) => s.trim()).filter(Boolean)).slice(0, 30),
  }
}

function clampScore(value?: number) {
  if (typeof value !== 'number' || Number.isNaN(value)) return undefined
  return Math.max(0, Math.min(100, Math.round(value)))
}

function dedupeStrings(values: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const value of values) {
    const trimmed = value.trim()
    if (!trimmed) continue
    const lower = trimmed.toLowerCase()
    if (seen.has(lower)) continue
    seen.add(lower)
    out.push(trimmed)
  }
  return out
}

function blendGeneratedText(original: string[], generated: string[], options?: { preferGenerated?: boolean }): string[] {
  const preferGenerated = Boolean(options?.preferGenerated)
  const cleanedOriginal = cleanTextList(original)
  const cleanedGenerated = cleanTextList(generated)

  if (!cleanedOriginal.length) return dedupeStrings(cleanedGenerated)
  if (!cleanedGenerated.length) return cleanedOriginal

  const out: string[] = []
  const seen = new Set<string>()

  const pushValue = (value: string) => {
    const trimmed = value.trim()
    if (!trimmed) return
    const key = normalizeKey(trimmed)
    if (!key || seen.has(key)) return
    seen.add(key)
    out.push(trimmed)
  }

  if (preferGenerated) {
    cleanedGenerated.forEach(pushValue)
    cleanedOriginal.forEach(pushValue)
    return out
  }

  const maxLen = Math.max(cleanedOriginal.length, cleanedGenerated.length)
  for (let i = 0; i < maxLen; i++) {
    const candidate = cleanedGenerated[i] || cleanedOriginal[i]
    if (candidate) pushValue(candidate)
  }

  return out
}

function cleanTextList(values: string[]): string[] {
  return values
    .map((value) => value?.toString().trim())
    .filter(Boolean) as string[]
}

function normalizeKey(value: string) {
  return value.replace(/\s+/g, ' ').trim().toLowerCase()
}

function mergeStringArrays(original: string[], generated: string[]): string[] {
  return dedupeStrings([...generated, ...original].map((s) => s?.toString().trim()).filter(Boolean) as string[])
}

function buildKeyedMap<T>(items: T[], keyFn: (item: T) => string): Map<string, T> {
  const map = new Map<string, T>()
  items.forEach((item) => {
    if (!item) return
    // @ts-expect-error - allow access to id when available without constraining the generic
    const id = item?.id as string | undefined
    if (id && !map.has(id)) {
      map.set(id, item)
    }
    const key = keyFn(item)
    if (key && !map.has(key)) {
      map.set(key, item)
    }
  })
  return map
}

function canonicalKeyParts(...values: Array<string | undefined | null>): string {
  const normalized = values
    .map((value) => (value ? normalizeEntityKey(value) : ''))
    .filter(Boolean)
  return normalized.join('|')
}

function normalizeEntityKey(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]/g, '')
}

const MONTH_MAP: Record<string, string> = {
  jan: '01',
  january: '01',
  feb: '02',
  february: '02',
  mar: '03',
  march: '03',
  apr: '04',
  april: '04',
  may: '05',
  jun: '06',
  june: '06',
  jul: '07',
  july: '07',
  aug: '08',
  august: '08',
  sep: '09',
  sept: '09',
  september: '09',
  oct: '10',
  october: '10',
  nov: '11',
  november: '11',
  dec: '12',
  december: '12',
}

function normalizeDateKey(value?: string | null): string {
  if (!value) return ''

  const trimmed = value.trim()
  if (!trimmed) return ''

  const lower = trimmed.toLowerCase()

  const isoMatch = lower.match(/((?:19|20)\d{2})[-/.](0?[1-9]|1[0-2])/)
  if (isoMatch) {
    return `${isoMatch[1]}${isoMatch[2].padStart(2, '0')}`
  }

  const flippedMatch = lower.match(/(0?[1-9]|1[0-2])[-/.]((?:19|20)\d{2})/)
  if (flippedMatch) {
    return `${flippedMatch[2]}${flippedMatch[1].padStart(2, '0')}`
  }

  let year = lower.match(/(19|20)\d{2}/)?.[0]
  let month = ''

  for (const [token, num] of Object.entries(MONTH_MAP)) {
    if (lower.includes(token)) {
      month = num
      break
    }
  }

  if (year && month) return `${year}${month}`
  if (year) return year

  const digitsOnly = lower.replace(/[^0-9]/g, '')
  if (digitsOnly.length >= 4) {
    return digitsOnly.slice(0, Math.min(6, digitsOnly.length))
  }

  return digitsOnly
}

function safeExtract(text?: string | null): ParsedResumeSections {
  if (!text || !text.trim()) return { summary: undefined, experience: [], projects: [], education: [], skills: [], blocks: [] }
  try {
    return extractFromResumeText(text.slice(0, 50_000))
  } catch (err) {
    console.warn('[ai] Failed to parse resume text fallback', err)
    return { summary: undefined, experience: [], projects: [], education: [], skills: [], blocks: [] }
  }
}

function ensureAllExperience(generated: ExperienceItem[], original: ExperienceItem[]): ExperienceItem[] {
  const orderedKeys: string[] = []
  const merged = new Map<string, ExperienceItem>()

  const assimilate = (entry: ExperienceItem) => {
    let key = experienceKey(entry)
    if (!key) key = `exp:${nanoid()}`
    const normalized: ExperienceItem = {
      ...entry,
      id: entry.id || nanoid(),
      achievements: dedupeStrings((entry.achievements || []).map((a) => a?.toString().trim()).filter(Boolean) as string[]),
      technologies: entry.technologies?.map((t) => t.trim()).filter(Boolean),
    }
    const existing = merged.get(key)
    if (existing) {
      merged.set(key, mergeExperienceEntry(existing, normalized))
    } else {
      orderedKeys.push(key)
      merged.set(key, normalized)
    }
  }

  generated.forEach(assimilate)
  original.forEach(assimilate)

  return orderedKeys.map((key) => merged.get(key)!).filter(Boolean)
}

function ensureAllProjects(generated: ProjectItem[], original: ProjectItem[]): ProjectItem[] {
  const orderedKeys: string[] = []
  const merged = new Map<string, ProjectItem>()

  const assimilate = (entry: ProjectItem) => {
    let key = projectKey(entry)
    if (!key) key = `proj:${nanoid()}`
    const normalized: ProjectItem = {
      ...entry,
      id: entry.id || nanoid(),
      highlights: dedupeStrings((entry.highlights || []).map((h) => h?.toString().trim()).filter(Boolean) as string[]),
      technologies: entry.technologies?.map((t) => t.trim()).filter(Boolean),
      summary: entry.summary?.trim() || '',
      name: entry.name?.trim() || entry.summary?.trim() || 'Project',
    }
    const existing = merged.get(key)
    if (existing) {
      merged.set(key, mergeProjectEntry(existing, normalized))
    } else {
      orderedKeys.push(key)
      merged.set(key, normalized)
    }
  }

  generated.forEach(assimilate)
  original.forEach(assimilate)

  return orderedKeys.map((key) => merged.get(key)!).filter(Boolean)
}

function ensureAllEducation(generated: EducationItem[], original: EducationItem[]): EducationItem[] {
  const orderedKeys: string[] = []
  const merged = new Map<string, EducationItem>()

  const assimilate = (entry: EducationItem) => {
    let key = educationKey(entry)
    if (!key) key = `edu:${nanoid()}`
    const normalized: EducationItem = {
      ...entry,
      id: entry.id || nanoid(),
      school: entry.school?.trim() || '',
      degree: entry.degree?.trim() || '',
    }
    const existing = merged.get(key)
    if (existing) {
      merged.set(key, mergeEducationEntry(existing, normalized))
    } else {
      orderedKeys.push(key)
      merged.set(key, normalized)
    }
  }

  generated.forEach(assimilate)
  original.forEach(assimilate)

  return orderedKeys.map((key) => merged.get(key)!).filter(Boolean)
}

function normalizeEducationOutput(entries: EducationItem[], source: EducationItem[]): EducationItem[] {
  const meaningful = entries.filter((entry) => {
    if (!entry) return false
    const school = sanitizeHeading(entry.school)
    const degree = sanitizeHeading(entry.degree)
    if (!school && !degree) return false
    const hasDetail = Boolean(entry.startDate || entry.endDate || entry.field || entry.location || entry.grade)
    return school.length > 1 || degree.length > 1 || hasDetail
  })

  if (!source.length) {
    return meaningful
  }

  return meaningful
}

function shouldDropExperienceEntry(entry: ExperienceItem, tokens: Set<string>): boolean {
  const heading = `${sanitizeHeading(entry.role)} ${sanitizeHeading(entry.company)}`.trim()
  const achievements = entry.achievements || []
  if (!achievements.length) return true
  const combined = achievements.join(' ').replace(/\s+/g, ' ').trim()
  const lower = combined.toLowerCase()

  if (!heading) {
    if (containsContactNoise(combined) || (tokens && textContainsToken(combined, tokens))) return true
    if (lower.includes('senior frontend developer') || lower.includes('profile summary') || lower.startsWith('experience ')) return true
    if (lower.includes('holding uk work visa') || lower.includes('professional summary')) return true
    if (combined.length > 320) return true
  }

  if (/\bprofile\b/i.test(lower) || /\bprofessional summary\b/i.test(lower)) return true
  if (combined.split(/\s+/).length > 150) return true

  return false
}

function sanitizeProjectEntries(projects: ProjectItem[], basics: BasicDetails, tokens: Set<string>): ProjectItem[] {
  return projects
    .map((project) => {
      const name = sanitizeHeading(project.name)
      const summary = sanitizeNarrative(project.summary, basics, 260)
      const highlights = (project.highlights || [])
        .map((highlight) => sanitizeNarrative(highlight, basics, 220))
        .filter(Boolean)
      return {
        ...project,
        name,
        summary,
        highlights,
      }
    })
    .filter((project) => {
      const hasName = Boolean(project.name && project.name.trim())
      const combined = [project.summary, ...project.highlights].join(' ').replace(/\s+/g, ' ').trim()
      if (!combined) return hasName
      if (containsContactNoise(combined)) return false
      if (textContainsToken(combined, tokens)) return false
      if (combined.length > 320) return false
      return hasName || project.summary.length > 0 || project.highlights.length > 0
    })
}

function experienceKey(entry: ExperienceItem): string {
  const key = canonicalKeyParts(entry.company, entry.role, normalizeDateKey(entry.startDate), normalizeDateKey(entry.endDate))
  if (key) return key
  if (entry.id) return `id:${entry.id}`
  return normalizeKey((entry.achievements || []).join(' '))
}

function projectKey(entry: ProjectItem): string {
  const key = canonicalKeyParts(entry.name, entry.summary || entry.highlights?.join(' '))
  if (key) return key
  if (entry.id) return `id:${entry.id}`
  return normalizeKey((entry.highlights || []).join(' '))
}

function educationKey(entry: EducationItem): string {
  const key = canonicalKeyParts(entry.school, entry.degree, normalizeDateKey(entry.startDate), normalizeDateKey(entry.endDate))
  if (key) return key
  if (entry.id) return `id:${entry.id}`
  return normalizeKey(entry.field || '')
}

function combineSkills(generated: string[], original: string[], basics: BasicDetails): string[] {
  const merged = dedupeStrings([...generated, ...original].map((s) => s.trim()).filter(Boolean))
  return filterSkillList(merged, basics).slice(0, 20)
}

function mergeProjectsIntoExperience(experience: ExperienceItem[], projects: ProjectItem[]): ExperienceItem[] {
  if (!projects.length) return experience

  if (!experience.length) {
    const fallback = projects.map((project) => ({
      id: project.id || nanoid(),
      role: project.name || 'Project',
      company: '',
      startDate: '',
      endDate: '',
      achievements: (project.highlights && project.highlights.length ? project.highlights : [project.summary || '']).filter(Boolean),
      technologies: project.technologies,
    }))
    return ensureAllExperience(fallback, [])
  }

  const merged = experience.map((entry) => ({
    ...entry,
    achievements: dedupeStrings((entry.achievements || []).map((a) => a.trim()).filter(Boolean)),
  }))

  const primary = merged[0]
  const seen = new Set(primary.achievements.map((a) => normalizeKey(a)))

  for (const project of projects) {
    const highlights = (project.highlights && project.highlights.length ? project.highlights : [project.summary || ''])
      .map((h) => h.trim())
      .filter(Boolean)
    if (!highlights.length) continue
    const label = project.name?.trim() || ''
    for (const highlight of highlights) {
      const entry = label ? `${label}: ${highlight}` : highlight
      const key = normalizeKey(entry)
      if (seen.has(key)) continue
      seen.add(key)
      primary.achievements.push(entry)
    }
  }

  return merged
}

function consolidateExperienceEntries(entries: ExperienceItem[]): ExperienceItem[] {
  const result: ExperienceItem[] = []
  const indexByKey = new Map<string, number>()

  for (const entry of entries) {
    const role = sanitizeHeading(entry.role)
    const company = sanitizeHeading(entry.company)
    const hasHeading = role || company

    if (!hasHeading) {
      if (entry.achievements?.length && result.length) {
        const target = result[result.length - 1]
        target.achievements = dedupeStrings([...(target.achievements || []), ...entry.achievements])
      }
      continue
    }

    const key = experienceHeadlineKey(entry)
    if (indexByKey.has(key)) {
      const idx = indexByKey.get(key)!
      result[idx] = mergeExperienceEntry(result[idx], entry)
    } else {
      indexByKey.set(key, result.length)
      result.push({
        ...entry,
        role,
        company,
        achievements: dedupeStrings(entry.achievements || []),
      })
    }
  }

  return result
}

function tidyBullets(lines: string[], tokens?: Set<string>): string[] {
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
      if (containsContactNoise(candidate)) continue
      if (tokens && textContainsToken(candidate, tokens)) continue
      if (candidate.length > 220) continue
      if (!/^[A-Z]/.test(candidate)) {
        candidate = candidate.charAt(0).toUpperCase() + candidate.slice(1)
      }
      if (!/[.!?]$/.test(candidate)) candidate += '.'
      const key = normalizeKey(candidate)
      if (seen.has(key)) continue
      seen.add(key)
      out.push(candidate)
      if (out.length >= 6) break
    }
    if (out.length >= 6) break
  }
  return out
}

function experienceHeadlineKey(entry: ExperienceItem): string {
  const heading = canonicalKeyParts(sanitizeHeading(entry.company), sanitizeHeading(entry.role))
  const start = normalizeDateKey(entry.startDate)
  if (heading) {
    const signature = [heading, start].filter(Boolean).join('|')
    return signature || heading
  }
  if (entry.id) return `id:${entry.id}`
  return normalizeKey((entry.achievements || []).join(' ')) || nanoid()
}

function pruneDuplicateExperienceContent(entries: ExperienceItem[], summary?: string, tokens?: Set<string>): ExperienceItem[] {
  const seen = new Set<string>()

  if (summary) {
    tidyBullets([summary], tokens).forEach((line) => seen.add(normalizeKey(line)))
    const summaryNameMatches = summary.match(NAME_EMAIL_PATTERN)
    if (summaryNameMatches) {
      summaryNameMatches.forEach((match) => {
        const key = normalizeKey(match)
        if (key) seen.add(key)
      })
    }
  }

  return entries
    .map((entry) => {
      const achievements = (entry.achievements || []).filter((ach) => {
        const key = normalizeKey(ach)
        if (!key) return false
        if (seen.has(key)) return false
        if (tokens && textContainsToken(ach, tokens)) return false
        if (containsContactNoise(ach)) return false
        seen.add(key)
        return true
      })
      return { ...entry, achievements }
    })
    .filter((entry) => {
      const hasHeading = sanitizeHeading(entry.role) || sanitizeHeading(entry.company)
      if (hasHeading) return true
      return entry.achievements.length > 0
    })
}

function dedupeExperienceCards(entries: ExperienceItem[]): ExperienceItem[] {
  const out: ExperienceItem[] = []
  const seen = new Set<string>()
  for (const entry of entries) {
    const hasBullets = !!(entry.achievements && entry.achievements.length)
    if (!hasBullets) continue
    const key = experienceHeadlineKey(entry)
    if (key && seen.has(key)) continue
    if (key) seen.add(key)
    out.push(entry)
  }
  return out
}

function mergeExperienceEntry(base: ExperienceItem, incoming: ExperienceItem): ExperienceItem {
  const startDate = pickDate(base.startDate, incoming.startDate) ?? base.startDate ?? incoming.startDate ?? ''
  const endDate = pickDate(base.endDate, incoming.endDate)
  return {
    ...base,
    role: pickRicher(sanitizeHeading(base.role), sanitizeHeading(incoming.role)),
    company: pickRicher(sanitizeHeading(base.company), sanitizeHeading(incoming.company)),
    location: pickRicherOptional(base.location, incoming.location),
    startDate,
    endDate,
    current: typeof base.current === 'boolean' ? base.current : incoming.current,
    technologies: mergeStringArrays(base.technologies || [], incoming.technologies || []),
    achievements: dedupeStrings([...(base.achievements || []), ...(incoming.achievements || [])]),
  }
}

function mergeProjectEntry(base: ProjectItem, incoming: ProjectItem): ProjectItem {
  return {
    ...base,
    name: pickRicher(base.name, incoming.name),
    url: base.url || incoming.url,
    summary: pickSummary(base.summary, incoming.summary, true),
    technologies: mergeStringArrays(base.technologies || [], incoming.technologies || []),
    highlights: dedupeStrings([...(base.highlights || []), ...(incoming.highlights || [])]),
  }
}

function mergeEducationEntry(base: EducationItem, incoming: EducationItem): EducationItem {
  return {
    ...base,
    school: pickRicher(base.school, incoming.school),
    degree: pickRicher(base.degree, incoming.degree),
    field: pickRicherOptional(base.field, incoming.field),
    startDate: pickDate(base.startDate, incoming.startDate) ?? base.startDate ?? incoming.startDate,
    endDate: pickDate(base.endDate, incoming.endDate),
    location: pickRicherOptional(base.location, incoming.location),
    grade: pickRicherOptional(base.grade, incoming.grade),
  }
}

function pickRicher(current: string, incoming?: string): string {
  if (!incoming) return current
  if (!current) return incoming
  return incoming.length > current.length ? incoming : current
}

function pickRicherOptional(current?: string, incoming?: string): string | undefined {
  if (!incoming && !current) return undefined
  if (!incoming) return current
  if (!current) return incoming
  return incoming.length > current.length ? incoming : current
}

function pickDate(current?: string, incoming?: string): string | undefined {
  if (!incoming && !current) return undefined
  const currentKey = normalizeDateKey(current)
  const incomingKey = normalizeDateKey(incoming)
  if (!incomingKey && !currentKey) return incoming ?? current
  if (!incomingKey) return current ?? incoming
  if (!currentKey) return incoming ?? current
  if (incomingKey === currentKey) {
    const incomingStr = incoming ?? ''
    const currentStr = current ?? ''
    return incomingStr.length > currentStr.length ? incomingStr : currentStr
  }
  return current ?? incoming
}

function sanitizeHeading(value?: string | null): string {
  if (!value) return ''
  const trimmed = value.trim()
  if (!trimmed) return ''
  if (/[•\n]/.test(trimmed)) return ''
  if (/[\w.+-]+@[\w.-]+/.test(trimmed)) return ''
  if (trimmed.length > 90) return ''
  return trimmed.replace(/\s+/g, ' ')
}

const REWRITE_KEYWORDS = ['reframe', 'rewrite', 'refresh', 'revise', 'rework', 'tailor', 'adapt', 'customize', 'align', 'modernize', 'update', 'optimize', 'enhance']
const NAME_EMAIL_PATTERN = /([A-Z][A-Za-z]+\s+[A-Z][A-Za-z]+)|([\w.+-]+@[\w.-]+)/g

function shouldFavorRewrite(data: ResumeData): boolean {
  if (!data) return false
  const cues: string[] = []
  if (data.instructions?.prompt) cues.push(data.instructions.prompt)
  if (Array.isArray(data.instructions?.goals)) cues.push(...data.instructions.goals)
  if (Array.isArray(data.instructions?.constraints)) cues.push(...data.instructions.constraints)
  const hasRewriteCue = cues.some((cue) => containsRewriteCue(cue))
  const hasJD = Boolean(data.attachments?.jobDescriptionText && data.attachments.jobDescriptionText.trim().length > 50)
  if (hasRewriteCue || hasJD) return true
  return !data.preserveStrict
}

function cleanSummaryText(primary?: string | null, fallback?: string | undefined, tokens?: Set<string>): string {
  const sources = [primary, fallback]
  for (const value of sources) {
    const raw = value?.toString().trim()
    if (!raw) continue
    const withoutContacts = raw
      .split(/\s*\n+\s*/)
      .filter((line) => !/[\w.+-]+@[\w.-]+/.test(line) && !/^\+?\d[\d\s().-]{6,}$/.test(line))
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim()

    if (!withoutContacts) continue

    const sentences = withoutContacts.split(/(?<=[.!?])\s+/).filter(Boolean)
    const truncated = sentences.slice(0, 2).join(' ')
    if (!truncated) continue
    if (tokens && textContainsToken(truncated, tokens)) continue
    if (containsContactNoise(truncated)) continue
    return truncated
  }
  return ''
}

function containsRewriteCue(value?: string | null): boolean {
  if (!value) return false
  const lower = value.toLowerCase()
  return REWRITE_KEYWORDS.some((kw) => lower.includes(kw))
}

function pickSummary(primary?: string | null, fallback?: string | null, preferPrimary = false): string {
  const primaryClean = primary?.toString().trim() || ''
  const fallbackClean = fallback?.toString().trim() || ''
  if (preferPrimary) {
    return primaryClean || fallbackClean
  }
  return primaryClean || fallbackClean
}

function buildPrompt(data: ResumeData): string {
  const lines: string[] = []
  const basics = data.basics
  const parsedFallback = safeExtract(data.attachments.existingResumeText)

  const experienceInput = data.experience.length ? data.experience : parsedFallback.experience
  const projectsInput = data.projects.length ? data.projects : parsedFallback.projects
  const educationInput = (data.education && data.education.length) ? data.education : parsedFallback.education
  const skillsInput = (data.skills && data.skills.length) ? data.skills : parsedFallback.skills
  const summaryInput = basics.summary?.trim() || parsedFallback.summary

  lines.push('Craft resume sections tailored to the following context. Use only the provided information—do not invent companies, dates, or credentials.')
  lines.push('Focus: Provide impact-oriented bullet points with concrete outcomes. Avoid placeholders like "XYZ" or generic filler.')
  lines.push('Preserve every experience and project supplied (including those from uploads). Rephrase for clarity, but do not drop roles, projects, or achievements. If bullets are provided, return at least the same number per item, keeping the core accomplishment.')
  if (data.preserveStrict) {
    lines.push('Rewrite policy: STRICT. Preserve the existing wording closely; fix grammar and flow but avoid major rewrites.')
  } else {
    lines.push('Rewrite policy: You may rewrite achievements for clarity, but keep them truthful and grounded in the provided details.')
  }
  lines.push('Return JSON that matches the supplied schema. Do not include commentary or markdown.')

  lines.push('\n### Candidate Basics')
  lines.push(`Name: ${basics.fullName || 'Unknown'}`)
  lines.push(`Email: ${basics.email || 'Unknown'}`)
  if (basics.headline) lines.push(`Headline: ${basics.headline}`)
  if (basics.location) lines.push(`Location: ${basics.location}`)
  if (basics.workAuth?.status) lines.push(`Work Authorization: ${basics.workAuth.status}`)
  if (summaryInput) {
    lines.push('\n### Existing Summary')
    lines.push(summaryInput)
  }

  if (skillsInput.length) {
    lines.push('\n### Skills Provided')
    lines.push(skillsInput.join(', '))
  }

  if (data.instructions.goals?.length) {
    lines.push('\n### Goals')
    for (const goal of data.instructions.goals) lines.push(`- ${goal}`)
  }
  if (data.instructions.keywords?.length) {
    lines.push('\n### Target Keywords')
    for (const kw of data.instructions.keywords) lines.push(`- ${kw}`)
  }
  if (data.instructions.constraints?.length) {
    lines.push('\n### Constraints')
    for (const constraint of data.instructions.constraints) lines.push(`- ${constraint}`)
  }
  if (data.instructions.prompt) {
    lines.push('\n### Custom Prompt')
    lines.push(data.instructions.prompt)
  }

  if (experienceInput.length) {
    lines.push('\n### Experience Provided')
    experienceInput.forEach((exp, idx) => {
      lines.push(`- Role: ${exp.role || 'Unknown'} at ${exp.company || 'Unknown'} (${exp.startDate || '?'} – ${exp.current ? 'Present' : exp.endDate || '?'})`)
      if (exp.location) lines.push(`  Location: ${exp.location}`)
      if (exp.technologies?.length) lines.push(`  Technologies: ${exp.technologies.join(', ')}`)
      if (exp.achievements?.length) {
        lines.push(`  Achievements (${exp.achievements.length} bullets):`)
        exp.achievements.forEach((ach, bulletIdx) => lines.push(`    ${bulletIdx + 1}. ${ach}`))
      }
    })
  }

  if (projectsInput.length) {
    lines.push('\n### Projects Provided')
    projectsInput.forEach((proj) => {
      lines.push(`- ${proj.name || 'Project'}: ${proj.summary || ''}`)
      if (proj.technologies?.length) lines.push(`  Technologies: ${proj.technologies.join(', ')}`)
      if (proj.highlights?.length) {
        lines.push(`  Highlights (${proj.highlights.length} bullets):`)
        proj.highlights.forEach((hl, bulletIdx) => lines.push(`    ${bulletIdx + 1}. ${hl}`))
      }
    })
  }

  if (educationInput.length) {
    lines.push('\n### Education Highlights (for context only)')
    educationInput.forEach((edu) => {
      lines.push(`- ${edu.degree || 'Program'} at ${edu.school}${edu.endDate ? ` (${edu.endDate})` : ''}`)
    })
  }

  if (data.attachments.jobDescriptionText) {
    lines.push('\n### Job Description (truncated)')
    lines.push(truncateText(data.attachments.jobDescriptionText, 3500))
  }

  if (data.attachments.existingResumeText) {
    lines.push('\n### Existing Resume Text (truncated)')
    lines.push(truncateText(data.attachments.existingResumeText, 3500))
  }

  lines.push('\n### Output Requirements')
  lines.push('- summary: 1-2 sentences, highlight strengths relevant to goals and JD.')
  lines.push('- skills: 6-12 concise items, prioritize technologies and tools from inputs and JD.')
  lines.push('- experience / projects: Rephrase or enhance provided bullets; retain truthful content, include metrics where given. Do not omit provided bullets—rewrite them so each original point is represented.')
  lines.push('- achievements/highlights: reflect every provided bullet (add more only when valuable), keep them action-driven with no placeholders.')
  lines.push('- education: Mirror each provided education record (school, degree, dates). Rephrase descriptions without dropping entries.')
  lines.push('- atsScore: approximate 0-100 match to JD. matchedKeywords: the JD keywords you used.')

  return lines.join('\n')
}

function truncateText(value: string, maxChars: number): string {
  if (value.length <= maxChars) return value
  return `${value.slice(0, maxChars)}…`
}

async function safeJson(res: Response) {
  try {
    return await res.json()
  } catch {
    return null
  }
}
