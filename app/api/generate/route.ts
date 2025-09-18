import { NextRequest, NextResponse } from 'next/server'
import { generateResumeDraft } from '@/lib/ai-server'
import type { ResumeData } from '@/lib/types'

export async function POST(req: NextRequest) {
  try {
    const data = (await req.json()) as ResumeData
    const result = await generateResumeDraft(data)
    return NextResponse.json(result)
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unknown error' }, { status: 500 })
  }
}
