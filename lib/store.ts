import { create } from 'zustand'
import { nanoid } from './util'
import type { ResumeData, ExperienceItem, ProjectItem, ResumeTemplateKey, BasicDetails, Instructions, Attachments, ResumeStyle } from './types'

type State = {
  basics: BasicDetails
  experience: ExperienceItem[]
  projects: ProjectItem[]
  attachments: Attachments
  instructions: Instructions
  template: ResumeTemplateKey
  style: ResumeStyle
}

type Actions = {
  setBasics: (v: Partial<BasicDetails>) => void
  addExperience: () => void
  updateExperience: (id: string, v: Partial<ExperienceItem>) => void
  removeExperience: (id: string) => void
  addProject: () => void
  updateProject: (id: string, v: Partial<ProjectItem>) => void
  removeProject: (id: string) => void
  setAttachments: (v: Partial<Attachments>) => void
  setInstructions: (v: Partial<Instructions>) => void
  setTemplate: (v: ResumeTemplateKey) => void
  setStyle: (v: Partial<ResumeStyle>) => void
  seedExample: () => void
  mergeParsed: (exp: ExperienceItem[], proj: ProjectItem[]) => void
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
  setAttachments: (v) => set((s) => ({ attachments: { ...s.attachments, ...v } })),
  setInstructions: (v) => set((s) => ({ instructions: { ...s.instructions, ...v } })),
  setTemplate: (v) => set(() => ({ template: v })),
  setStyle: (v) => set((s) => ({ style: { ...s.style, ...v } })),
  seedExample: () => set((s) => ({
    basics: {
      ...s.basics,
      fullName: s.basics.fullName || 'Your Name',
      email: s.basics.email || 'you@example.com',
      headline: s.basics.headline || 'Software Engineer',
      location: s.basics.location || 'Remote',
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
          'Built an AI‑assisted resume generator used by 1k+ users.',
          'Increased ATS keyword match by 30% using smart extraction.',
          'Improved PDF export fidelity and reduced support tickets by 40%.',
          'Collaborated with design to ship a vibrant, accessible UI.',
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
          'Implemented client‑side PDF/DOCX parsing (pdfjs, mammoth).',
          'Designed modern templates with print‑perfect exports.',
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
  })),
  mergeParsed: (exp, proj) => set((s) => ({
    experience: s.experience.length ? s.experience : exp.concat(s.experience),
    projects: s.projects.length ? s.projects : proj.concat(s.projects),
  })),
  reset: () => set(() => ({ ...initialState })),
}))

export const snapshot = (): ResumeData => {
  const s = useResumeStore.getState()
  return {
    basics: s.basics,
    experience: s.experience,
    projects: s.projects,
    attachments: s.attachments,
    instructions: s.instructions,
    template: s.template,
    style: s.style,
  }
}
