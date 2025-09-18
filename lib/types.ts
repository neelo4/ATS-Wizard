export type WorkAuthorization =
  | { status: 'Citizen' | 'Permanent Resident' | 'Not Applicable' }
  | { status: 'Work Visa'; visaType: string; expiry?: string }

export interface ExperienceItem {
  id: string
  role: string
  company: string
  location?: string
  startDate: string
  endDate?: string
  current?: boolean
  achievements: string[]
  technologies?: string[]
}

export interface ProjectItem {
  id: string
  name: string
  url?: string
  summary: string
  highlights: string[]
  technologies?: string[]
}

export interface EducationItem {
  id: string
  school: string
  degree: string
  field?: string
  startDate?: string
  endDate?: string
  grade?: string
  location?: string
}

export interface BasicDetails {
  fullName: string
  email: string
  phone?: string
  location?: string
  headline?: string
  summary?: string
  linkedin?: string
  github?: string
  portfolio?: string
  workAuth?: WorkAuthorization
}

export interface Attachments {
  existingResumeText?: string
  jobDescriptionText?: string
  existingResumeFile?: { name: string; type: string; dataUrl: string }
  jobDescriptionFile?: { name: string; type: string; dataUrl: string }
}

export interface Instructions {
  goals: string[]
  keywords?: string[]
  constraints?: string[]
  prompt?: string
}

export interface ResumeData {
  basics: BasicDetails
  experience: ExperienceItem[]
  projects: ProjectItem[]
  education?: EducationItem[]
  skills?: string[]
  attachments: Attachments
  instructions: Instructions
  template: ResumeTemplateKey
  style: ResumeStyle
  preserveStrict?: boolean
}

export type ResumeTemplateKey = 'modern' | 'classic' | 'vibrant'

export interface GeneratedResume {
  sections: {
    summary: string
    skills: string[]
    experience: ExperienceItem[]
    projects: ProjectItem[]
    education: EducationItem[]
  }
  atsScore?: number
  matchedKeywords?: string[]
}

export type ResumeStyle = {
  font: 'sans' | 'serif' | 'mono' | 'avenir'
  accent: string // hex color like #2563eb
}

export type WizardStep = 'uploads' | 'details' | 'education' | 'experience' | 'projects' | 'instructions' | 'preview'
