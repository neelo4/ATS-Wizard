import { create } from 'zustand'
import { nanoid, containsContactNoise, filterSkillList } from './util'
import type {
  ResumeData,
  ExperienceItem,
  ProjectItem,
  ResumeTemplateKey,
  BasicDetails,
  Instructions,
  Attachments,
  ResumeStyle,
  EducationItem,
  GeneratedResume,
  WizardStep,
} from './types'

type State = {
  basics: BasicDetails
  experience: ExperienceItem[]
  projects: ProjectItem[]
  education: EducationItem[]
  skills: string[]
  attachments: Attachments
  instructions: Instructions
  template: ResumeTemplateKey
  style: ResumeStyle
  mode: 'original' | 'refined'
  instructionsVersion: number
  preserveStrict: boolean
  step: WizardStep
}

type Actions = {
  setBasics: (v: Partial<BasicDetails>) => void
  addExperience: () => void
  updateExperience: (id: string, v: Partial<ExperienceItem>) => void
  removeExperience: (id: string) => void
  addProject: () => void
  updateProject: (id: string, v: Partial<ProjectItem>) => void
  removeProject: (id: string) => void
  addEducation: () => void
  updateEducation: (id: string, v: Partial<EducationItem>) => void
  removeEducation: (id: string) => void
  setAttachments: (v: Partial<Attachments>) => void
  setInstructions: (v: Partial<Instructions>) => void
  setTemplate: (v: ResumeTemplateKey) => void
  setStyle: (v: Partial<ResumeStyle>) => void
  setMode: (v: 'original' | 'refined') => void
  bumpInstructionsVersion: () => void
  setPreserveStrict: (v: boolean) => void
  seedExample: () => void
  setSkills: (skills: string[]) => void
  setStep: (v: WizardStep) => void
  mergeParsedSections: (payload: {
    summary?: string
    experience?: ExperienceItem[]
    projects?: ProjectItem[]
    education?: EducationItem[]
    skills?: string[]
  }) => void
  applyGenerated: (payload: GeneratedResume) => void
  reset: () => void
}

const initialState: State = {
  basics: { fullName: '', email: '' },
  experience: [],
  projects: [],
  attachments: {},
  instructions: { goals: [], keywords: [], constraints: [], prompt: '' },
  template: 'modern',
  style: { font: 'sans', accent: '#2563eb' },
  mode: 'refined',
  instructionsVersion: 0,
  education: [],
  skills: [],
  preserveStrict: false,
  step: 'details',
}

export const useResumeStore = create<State & Actions>((set) => ({
  ...initialState,
  setBasics: (v) => set((s) => ({ basics: { ...s.basics, ...v } })),
  addExperience: () => set((s) => ({
    experience: s.experience.concat({
      id: nanoid(),
      role: '',
      company: '',
      startDate: '',
      achievements: [''],
    }),
  })),
  updateExperience: (id, v) => set((s) => ({
    experience: s.experience.map((e) => (e.id === id ? { ...e, ...v } : e)),
  })),
  removeExperience: (id) => set((s) => ({
    experience: s.experience.filter((e) => e.id !== id),
  })),
  addProject: () => set((s) => ({
    projects: s.projects.concat({ id: nanoid(), name: '', summary: '', highlights: [''] }),
  })),
  updateProject: (id, v) => set((s) => ({
    projects: s.projects.map((p) => (p.id === id ? { ...p, ...v } : p)),
  })),
  removeProject: (id) => set((s) => ({
    projects: s.projects.filter((p) => p.id !== id),
  })),
  addEducation: () => set((s) => ({
    education: s.education.concat({ id: nanoid(), school: '', degree: '', startDate: '', endDate: '' }),
  })),
  updateEducation: (id, v) => set((s) => ({
    education: s.education.map((e) => (e.id === id ? { ...e, ...v } : e)),
  })),
  removeEducation: (id) => set((s) => ({
    education: s.education.filter((e) => e.id !== id),
  })),
  setAttachments: (v) => set((s) => ({
    attachments: { ...s.attachments, ...v },
    mode: v.existingResumeFile ? 'original' : s.mode,
  })),
  setInstructions: (v) => set((s) => ({ instructions: { ...s.instructions, ...v } })),
  setTemplate: (v) => set(() => ({ template: v })),
  setStyle: (v) => set((s) => ({ style: { ...s.style, ...v } })),
  setMode: (v) => set(() => ({ mode: v })),
  bumpInstructionsVersion: () => set((s) => ({ instructionsVersion: s.instructionsVersion + 1 })),
  setPreserveStrict: (v) => set(() => ({ preserveStrict: v })),
  setSkills: (skills) => set(() => ({ skills })),
  setStep: (v) => set(() => ({ step: v })),
  seedExample: () => set((s) => ({
    basics: {
      ...s.basics,
      fullName: s.basics.fullName || 'Your Name',
      email: s.basics.email || 'you@example.com',
      headline: s.basics.headline || 'Software Engineer',
      location: s.basics.location || 'Remote',
      summary: s.basics.summary || 'Full-stack engineer delivering resilient web experiences with measurable impact.',
    },
    experience: s.experience.length ? s.experience : [
      {
        id: nanoid(),
        role: 'Software Engineer',
        company: 'AI Resume Studio',
        location: 'Remote',
        startDate: `${new Date().getFullYear() - 1}`,
        current: true,
        achievements: [
          'Launched an AI‑assisted resume generator with inline editing and instant PDF/DOCX exports for 1k+ users.',
          'Increased ATS keyword match by 30% using smart extraction.',
          'Improved PDF export fidelity and reduced support requests by 40% through automated testing.',
          'Collaborated with design to ship a vibrant, accessible UI supporting multiple templates.',
        ],
        technologies: ['react', 'typescript', 'nextjs', 'tailwind', 'zustand'],
      },
      {
        id: nanoid(),
        role: 'Frontend Engineer',
        company: 'Acme Corp',
        location: 'Hybrid',
        startDate: `${new Date().getFullYear() - 3}`,
        endDate: `${new Date().getFullYear() - 1}`,
        achievements: [
          'Led migration from class components to hooks across 20+ views.',
          'Optimized bundle size by 25% with code‑splitting and tree‑shaking.',
        ],
        technologies: ['react', 'webpack', 'redux'],
      },
    ],
    projects: s.projects.length ? s.projects : [
      {
        id: nanoid(),
        name: 'Project Atlas',
        url: '',
        summary: 'Full‑stack app to craft job‑tailored, ATS‑friendly resumes with live preview.',
        highlights: [
          'Implemented client‑side PDF/DOCX parsing and one-click downloads.',
          'Designed modern templates with live preview and editing controls.',
        ],
        technologies: ['nextjs', 'tailwind', 'zustand'],
      },
      {
        id: nanoid(),
        name: 'Realtime Chat',
        url: '',
        summary: 'WebSocket chat with presence, typing indicators, and persisted history.',
        highlights: ['Built with Socket.IO and optimistic UI updates'],
        technologies: ['react', 'node', 'socket.io'],
      },
    ],
    education: s.education.length ? s.education : [
      {
        id: nanoid(),
        school: 'State University',
        degree: 'B.Sc. Computer Science',
        startDate: `${new Date().getFullYear() - 7}`,
        endDate: `${new Date().getFullYear() - 3}`,
        location: 'Remote',
      },
    ],
    skills: s.skills.length ? s.skills : ['React', 'TypeScript', 'Next.js', 'Tailwind CSS', 'GraphQL', 'Node.js'],
  })),
  mergeParsedSections: ({ summary, experience, projects, education, skills }) => set((s) => ({
    basics: summary ? { ...s.basics, summary } : s.basics,
    experience: experience ? mergeUniqueExp(s.experience, experience) : s.experience,
    projects: projects ? mergeUniqueProj(s.projects, projects) : s.projects,
    education: education ? mergeUniqueEdu(s.education, education) : s.education,
    skills: skills?.length ? mergeSkills(s.skills, skills) : s.skills,
    preserveStrict: false,
  })),
  applyGenerated: (payload) => set((s) => {
    const nextSkills = filterSkillList(payload.sections.skills || [], s.basics)
    return {
      basics: payload.sections.summary
        ? { ...s.basics, summary: payload.sections.summary }
        : s.basics,
      experience: normalizeGeneratedExperience(payload.sections.experience),
      projects: normalizeGeneratedProjects(payload.sections.projects),
      education: normalizeGeneratedEducation(payload.sections.education),
      skills: nextSkills.length ? nextSkills : s.skills,
      preserveStrict: true,
    }
  }),
  reset: () => set(() => ({ ...initialState })),
}))

export const snapshot = (): ResumeData => {
  const s = useResumeStore.getState()
  return {
    basics: s.basics,
    experience: s.experience,
    projects: s.projects,
    education: s.education,
    skills: s.skills,
    attachments: s.attachments,
    instructions: s.instructions,
    template: s.template,
    style: s.style,
    preserveStrict: s.preserveStrict,
  }
}

function mergeUniqueExp(existing: ExperienceItem[], incoming: ExperienceItem[]) {
  const seen = new Set(existing.map((e) => `${e.company}|${e.role}|${e.startDate}`.toLowerCase()))
  const add = incoming.filter((e) => !seen.has(`${e.company}|${e.role}|${e.startDate}`.toLowerCase()))
  return existing.concat(add)
}

function mergeUniqueProj(existing: ProjectItem[], incoming: ProjectItem[]) {
  const seen = new Set(existing.map((p) => (p.name || '').toLowerCase()))
  const add = incoming.filter((p) => !seen.has((p.name || '').toLowerCase()))
  return existing.concat(add)
}

function mergeUniqueEdu(existing: EducationItem[], incoming: EducationItem[]) {
  const seen = new Set(existing.map((e) => `${e.school}|${e.degree}|${e.startDate}`.toLowerCase()))
  const add = incoming.filter((e) => !seen.has(`${e.school}|${e.degree}|${e.startDate}`.toLowerCase()))
  return existing.concat(add)
}

function mergeSkills(existing: string[], incoming: string[]) {
  const next = (existing || []).concat(incoming || [])
  const seen = new Set<string>()
  const out: string[] = []
  for (const skill of next) {
    const trimmed = (skill || '').trim()
    if (!trimmed) continue
    const key = trimmed.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(trimmed)
  }
  return out
}

function normalizeGeneratedExperience(entries: ExperienceItem[] | undefined): ExperienceItem[] {
  if (!entries?.length) return []
  return entries.map((entry) => ({
    ...entry,
    id: entry.id || nanoid(),
    achievements: sanitizeGeneratedList(entry.achievements),
  }))
}

function normalizeGeneratedProjects(entries: ProjectItem[] | undefined): ProjectItem[] {
  if (!entries?.length) return []
  return entries.map((entry) => ({
    ...entry,
    id: entry.id || nanoid(),
    summary: entry.summary || '',
    highlights: sanitizeGeneratedList(entry.highlights),
  }))
}

function normalizeGeneratedEducation(entries: EducationItem[] | undefined): EducationItem[] {
  if (!entries?.length) return []
  return entries.map((entry) => ({
    ...entry,
    id: entry.id || nanoid(),
  }))
}

function sanitizeGeneratedList(values?: string[]): string[] {
  if (!values?.length) return ['']
  const cleaned = values
    .map((value) => value?.toString().trim())
    .filter((value): value is string => Boolean(value && !containsContactNoise(value) && value.length <= 220))
  return cleaned.length ? cleaned : ['']
}
