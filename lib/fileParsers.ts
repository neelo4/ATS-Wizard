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

export async function parseImage(file: File): Promise<string> {
  // OCR client-side via CDN to avoid bundler dependency on tesseract.js
  await loadScriptOnce('https://cdn.jsdelivr.net/npm/tesseract.js@5.0.4/dist/tesseract.min.js')
  const T = (window as any).Tesseract
  if (!T || !T.createWorker) return ''
  try {
    // Avoid passing functions (e.g., logger) to the worker — causes DataCloneError
    const worker = await T.createWorker()
    await worker.loadLanguage('eng')
    await worker.initialize('eng')
    const blob = new Blob([await file.arrayBuffer()], { type: file.type || 'image/png' })
    const url = URL.createObjectURL(blob)
    const { data } = await worker.recognize(url)
    URL.revokeObjectURL(url)
    await worker.terminate()
    return (data && (data as any).text) || ''
  } catch (e) {
    console.error('OCR failed', e)
    return ''
  }
}

export async function parseUnknown(file: File): Promise<string> {
  const ext = file.name.toLowerCase().split('.').pop()
  if (ext === 'pdf') return parsePDF(file)
  if (ext === 'docx') return parseDOCX(file)
  if (['png', 'jpg', 'jpeg'].includes(ext || '') || (file.type && file.type.startsWith('image/'))) return parseImage(file)
  // Try as text fallback
  return await file.text()
}

let __tesseractLoaded = false
async function loadScriptOnce(src: string): Promise<void> {
  if (__tesseractLoaded) return
  await new Promise<void>((resolve, reject) => {
    const s = document.createElement('script')
    s.src = src
    s.async = true
    s.onload = () => { __tesseractLoaded = true; resolve() }
    s.onerror = () => reject(new Error('Failed to load OCR library'))
    document.head.appendChild(s)
  })
}
