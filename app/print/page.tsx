"use client"
import { useEffect, useState } from 'react'
import { ResumeDocument } from '@/lib/templates'
import type { GeneratedResume, ResumeData } from '@/lib/types'

export default function PrintPage() {
  const [payload, setPayload] = useState<{ data: ResumeData; gen: GeneratedResume } | null>(null)

  useEffect(() => {
    const raw = localStorage.getItem('resume-print-payload')
    if (raw) {
      const parsed = JSON.parse(raw)
      setPayload(parsed)
      const base = `${parsed?.data?.basics?.fullName || 'Candidate'} - Resume`
      document.title = base
      ;(async () => {
        try {
          await generatePdfDirect('resume-print', `${base}.pdf`)
        } catch {
          setTimeout(() => window.print(), 250)
        }
      })()
    }
  }, [])

  if (!payload) {
    return (
      <div className="p-8 text-center text-sm text-gray-600">No resume found. Close this tab and try again.</div>
    )
  }

  return (
    <div className="min-h-screen bg-white p-8 print:p-0">
      <div id="resume-print" className="mx-auto max-w-3xl">
        <ResumeDocument data={payload.data} generated={payload.gen} view="print" />
      </div>
    </div>
  )
}

async function generatePdfDirect(elementId: string, filename: string) {
  // Load libraries from CDN at runtime (browser). If it fails, throw to fallback on window.print.
  const html2canvas = await loadScript<any>('https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js').then(() => (window as any).html2canvas)
  const jsPDFNS = await loadScript<any>('https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js').then(() => (window as any).jspdf)
  const el = document.getElementById(elementId)
  if (!el || !html2canvas || !jsPDFNS) throw new Error('deps not ready')

  const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: '#ffffff' })
  const imgData = canvas.toDataURL('image/png')
  const pdf = new jsPDFNS.jsPDF('p', 'mm', 'a4')

  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const imgProps = { width: canvas.width, height: canvas.height }
  const ratio = Math.min(pageWidth / imgProps.width, pageHeight / imgProps.height)
  const w = imgProps.width * ratio
  const h = imgProps.height * ratio
  const x = (pageWidth - w) / 2
  const y = 0
  pdf.addImage(imgData, 'PNG', x, y, w, h)
  pdf.save(filename)
}

function loadScript<T = any>(src: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = src
    s.async = true
    s.onload = () => resolve((window as any))
    s.onerror = reject
    document.head.appendChild(s)
  })
}
