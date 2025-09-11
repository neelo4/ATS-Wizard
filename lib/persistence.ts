import type { ResumeData } from './types'

const BASE = 'resume-creator'

export function saveResume(userId: string, data: ResumeData) {
  try {
    localStorage.setItem(`${BASE}:user:${userId}:resume`, JSON.stringify(data))
  } catch {}
}

export function loadResume(userId: string): ResumeData | null {
  try {
    const raw = localStorage.getItem(`${BASE}:user:${userId}:resume`)
    return raw ? (JSON.parse(raw) as ResumeData) : null
  } catch {
    return null
  }
}

export function hasResume(userId: string): boolean {
  try {
    return !!localStorage.getItem(`${BASE}:user:${userId}:resume`)
  } catch {
    return false
  }
}

