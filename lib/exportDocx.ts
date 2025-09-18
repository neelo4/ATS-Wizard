import type { GeneratedResume, ResumeData } from './types'

// Client-side DOCX export without bundler dependency.
// Loads docx from CDN at runtime and uses window.docx UMD bundle.
export async function downloadRefinedDocx(filename: string, data: ResumeData, gen: GeneratedResume) {
  const docx = await loadDocx()
  if (!docx) {
    alert('DOCX exporter failed to load. Please check your network and try again.')
    return
  }
  const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } = docx

  const sections: any[] = []

  // Header: Name + role
  sections.push(
    new Paragraph({
      text: data.basics.fullName || 'Your Name',
      heading: HeadingLevel.TITLE,
    }),
    new Paragraph({
      spacing: { after: 200 },
      children: [
        new TextRun({ text: data.basics.headline || 'Software Engineer', color: '333333' }),
      ],
    })
  )

  // Contact line
  const contactParts = [data.basics.email, data.basics.phone, data.basics.location].filter(Boolean)
  if (contactParts.length) {
    sections.push(
      new Paragraph({
        spacing: { after: 300 },
        children: [new TextRun({ text: contactParts.join(' | '), color: '666666' })],
      })
    )
  }

  // Profile
  sections.push(
    new Paragraph({ text: 'Profile', heading: HeadingLevel.HEADING_2 }),
    new Paragraph({ text: gen.sections.summary, spacing: { after: 200 } })
  )

  // Experience
  if (gen.sections.experience.length) {
    sections.push(new Paragraph({ text: 'Experience', heading: HeadingLevel.HEADING_2 }))
    for (const e of gen.sections.experience) {
      const title = [e.role || 'Software Engineer', e.company].filter(Boolean).join(' — ')
      const dates = [e.startDate, e.endDate || (e.current ? 'Present' : '')].filter(Boolean).join(' – ')
      sections.push(new Paragraph({ text: title, heading: HeadingLevel.HEADING_3 }))
      if (dates) sections.push(new Paragraph({ text: dates, spacing: { after: 100 }, alignment: AlignmentType.RIGHT }))
      for (const a of e.achievements) sections.push(bullet(a))
    }
  }

  // Skills
  if (gen.sections.skills.length) {
    sections.push(new Paragraph({ text: 'Skills', heading: HeadingLevel.HEADING_2 }))
    for (const s of gen.sections.skills) sections.push(bullet(s))
  }

  // Education (from data)
  if (data.education && data.education.length) {
    sections.push(new Paragraph({ text: 'Education', heading: HeadingLevel.HEADING_2 }))
    for (const ed of data.education) {
      const t = [ed.degree, ed.field].filter(Boolean).join(', ')
      const line = [t || ed.degree, ed.school].filter(Boolean).join(' — ')
      const dates = [ed.startDate, ed.endDate].filter(Boolean).join(' – ')
      sections.push(new Paragraph({ text: line, heading: HeadingLevel.HEADING_3 }))
      if (dates || ed.location) sections.push(new Paragraph({ text: [dates, ed.location].filter(Boolean).join(' • ') }))
    }
  }

  // Projects
  if (gen.sections.projects.length) {
    sections.push(new Paragraph({ text: 'Projects', heading: HeadingLevel.HEADING_2 }))
    for (const p of gen.sections.projects) {
      sections.push(new Paragraph({ text: p.name, heading: HeadingLevel.HEADING_3 }))
      if (p.summary) sections.push(new Paragraph({ text: p.summary }))
      for (const h of p.highlights) sections.push(bullet(h))
    }
  }

  const doc = new Document({ sections: [{ properties: {}, children: sections }] })
  const blob = await Packer.toBlob(doc)
  triggerDownload(filename.endsWith('.docx') ? filename : `${filename}.docx`, blob)
}

function bullet(text: string) {
  const docx = (window as any).docx
  return new docx.Paragraph({
    text,
    bullet: { level: 0 },
    spacing: { after: 100 },
  })
}

function triggerDownload(name: string, blob: Blob) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
}

async function loadDocx(): Promise<any | null> {
  const g: any = window as any
  if (g.docx) return g.docx
  try {
    await loadScriptOnce('https://cdn.jsdelivr.net/npm/docx@8.5.0/build/index.js')
    return g.docx || null
  } catch (e) {
    console.error('Failed to load docx from CDN', e)
    return null
  }
}

let __docxScriptLoaded = false
function loadScriptOnce(src: string): Promise<void> {
  if (__docxScriptLoaded) return Promise.resolve()
  return new Promise<void>((resolve, reject) => {
    const s = document.createElement('script')
    s.src = src
    s.async = true
    s.onload = () => { __docxScriptLoaded = true; resolve() }
    s.onerror = () => reject(new Error('Failed to load DOCX library'))
    document.head.appendChild(s)
  })
}
