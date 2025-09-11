import { NextRequest, NextResponse } from 'next/server'
import { generateResumeDraft } from '@/lib/ai'

export async function POST(req: NextRequest) {
  try {
    const data = await req.json()
    const result = await generateResumeDraft(data)
    return NextResponse.json(result)
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unknown error' }, { status: 500 })
  }
}

