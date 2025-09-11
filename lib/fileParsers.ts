// Client-side parsers with dynamic imports to keep bundle small.
export async function parsePDF(file: File): Promise<string> {
  const pdfjs = await import('pdfjs-dist/build/pdf')
  // @ts-ignore - worker entry
  const pdfjsWorker = await import('pdfjs-dist/build/pdf.worker.entry')
  ;(pdfjs as any).GlobalWorkerOptions.workerSrc = pdfjsWorker

  const buf = await file.arrayBuffer()
  const pdf = await (pdfjs as any).getDocument({ data: buf }).promise
  let text = ''
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    text += content.items.map((it: any) => it.str).join(' ') + '\n'
  }
  return text
}

export async function parseDOCX(file: File): Promise<string> {
  const mammoth = await import('mammoth')
  const buf = await file.arrayBuffer()
  const res = await (mammoth as any).extractRawText({ arrayBuffer: buf })
  return res.value as string
}

export async function parseUnknown(file: File): Promise<string> {
  const ext = file.name.toLowerCase().split('.').pop()
  if (ext === 'pdf') return parsePDF(file)
  if (ext === 'docx') return parseDOCX(file)
  // Try as text fallback
  return await file.text()
}

