import type { GeneratedResume, ResumeData } from './types'
import { generateLocalResumeDraft } from './ai-local'

export async function generateResumeDraft(data: ResumeData): Promise<GeneratedResume> {
  try {
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })

    if (!res.ok) {
      const detail = await safeJson(res)
      throw new Error(detail?.error || `Request failed with status ${res.status}`)
    }

    const payload = (await res.json()) as GeneratedResume & { error?: string }
    if (payload?.error) throw new Error(payload.error)
    if (!payload?.sections) throw new Error('Malformed response from /api/generate')
    return payload
  } catch (err) {
    console.warn('[ai] Falling back to local generator', err)
    return generateLocalResumeDraft(data)
  }
}

async function safeJson(res: Response) {
  try {
    return await res.json()
  } catch {
    return null
  }
}
