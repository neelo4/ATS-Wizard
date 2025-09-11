import type { ExperienceItem, ProjectItem } from './types'
import { nanoid, tokenize, unique } from './util'

const ACTION_VERBS = ['built','developed','designed','implemented','optimized','reduced','increased','improved','led','migrated','launched']

export function extractFromResumeText(text: string): { experience: ExperienceItem[]; projects: ProjectItem[] } {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  const lower = text.toLowerCase()
  const hasProjectsSection = /\bprojects?\b/.test(lower)
  const hasExperienceSection = /(work\s+experience|experience|employment)/.test(lower)

  const bullets = lines.filter((l) => /^[-•▪︎●]/.test(l) || ACTION_VERBS.some((v) => l.toLowerCase().startsWith(v)))

  const guessTech = unique(tokenize(text)).filter((t) => /^(react|next|node|typescript|javascript|python|java|aws|azure|gcp|docker|kubernetes|graphql|tailwind|redux|postgres|mysql)$/.test(t))

  const exp: ExperienceItem[] = []
  const proj: ProjectItem[] = []

  if (hasExperienceSection || bullets.length) {
    const ach = bullets.slice(0, 5).map(cleanBullet)
    exp.push({ id: nanoid(), role: 'Software Engineer', company: 'Previous Employer', startDate: '', achievements: ach, technologies: guessTech })
  }

  if (hasProjectsSection || bullets.length > 2) {
    proj.push({ id: nanoid(), name: 'Highlighted Project', summary: 'Key project inferred from uploaded resume.', highlights: bullets.slice(0, 3).map(cleanBullet), technologies: guessTech })
  }

  return { experience: exp, projects: proj }
}

function cleanBullet(s: string) {
  return s.replace(/^[-•▪︎●\s]+/, '').trim()
}

