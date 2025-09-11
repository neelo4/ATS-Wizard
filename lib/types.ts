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

export interface BasicDetails {
  fullName: string
  email: string
  phone?: string
  location?: string
  headline?: string
  linkedin?: string
  github?: string
  portfolio?: string
  workAuth?: WorkAuthorization
}

export interface Attachments {
  existingResumeText?: string
  jobDescriptionText?: string
}

export interface Instructions {
  goals: string[]
  keywords?: string[]
  constraints?: string[]
}

export interface ResumeData {
  basics: BasicDetails
  experience: ExperienceItem[]
  projects: ProjectItem[]
  attachments: Attachments
  instructions: Instructions
  template: ResumeTemplateKey
}

export type ResumeTemplateKey = 'modern' | 'classic' | 'vibrant'

export interface GeneratedResume {
  sections: {
    summary: string
    skills: string[]
    experience: ExperienceItem[]
    projects: ProjectItem[]
  }
  atsScore?: number
  matchedKeywords?: string[]
}
