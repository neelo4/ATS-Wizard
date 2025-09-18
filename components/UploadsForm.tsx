"use client"
import { parseUnknown, parseImage } from '@/lib/fileParsers'
import { useResumeStore } from '@/lib/store'
import { useEffect, useState, useRef } from 'react'
import Modal from '@/components/ui/Modal'
import { extractFromResumeText, type ParsedResumeSections, type ParsedResumeBlock } from '@/lib/extract'

export default function UploadsForm() {
  const [resumeName, setResumeName] = useState<string>('')
  const [jdName, setJdName] = useState<string>('')
  const [previewResume, setPreviewResume] = useState<string>('')
  const [previewJD, setPreviewJD] = useState<string>('')
  const [importStatus, setImportStatus] = useState<string>('')
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [parsedResume, setParsedResume] = useState<ParsedResumeSections | null>(null)
  const [rawBlocks, setRawBlocks] = useState<ParsedResumeBlock[]>([])
  const [selectedBlocks, setSelectedBlocks] = useState<Record<string, boolean>>({})
  const [showResumePreview, setShowResumePreview] = useState(true)
  const setAttachments = useResumeStore((s) => s.setAttachments)
  const mergeParsedSections = useResumeStore((s) => s.mergeParsedSections)
  const attachments = useResumeStore((s) => s.attachments)
  const instructions = useResumeStore((s) => s.instructions)
  const setStep = useResumeStore((s) => s.setStep)
  const jobDescriptionText = useResumeStore((s) => s.attachments.jobDescriptionText || '')
  const hasInstructions = Boolean(
    (instructions.prompt && instructions.prompt.trim()) ||
    (instructions.goals && instructions.goals.length) ||
    (instructions.keywords && instructions.keywords.length) ||
    (instructions.constraints && instructions.constraints.length)
  )

  useEffect(() => {
    if (jobDescriptionText) setPreviewJD(jobDescriptionText.slice(0, 4000))
    else setPreviewJD('')
  }, [jobDescriptionText])

  function summarizeParsed(parsed: ParsedResumeSections, suffix?: string): string {
    const bits: string[] = []
    if (parsed.summary?.trim()) bits.push('profile summary')
    if (parsed.experience.length) bits.push(`${parsed.experience.length} work section${parsed.experience.length === 1 ? '' : 's'}`)
    if (parsed.projects.length) bits.push(`${parsed.projects.length} project${parsed.projects.length === 1 ? '' : 's'}`)
    if (parsed.education.length) bits.push(`${parsed.education.length} education detail${parsed.education.length === 1 ? '' : 's'}`)
    if (parsed.skills.length) bits.push(`${parsed.skills.length} skill${parsed.skills.length === 1 ? '' : 's'}`)
    if (!bits.length) return 'We couldn’t recognise any sections in that file. Try another format or upload a clearer copy.'
    const note = suffix ? ` ${suffix}` : ''
    return `Great! We collected ${bits.join(', ')}.${note}`
  }

  async function parseResumeText(text: string, { openModal }: { openModal: boolean }) {
    if (!text.trim()) {
      setImportStatus('No text detected in the uploaded resume. Try uploading a PDF/DOCX or ensure OCR completed.')
      return
    }
    const parsed = extractFromResumeText(text)
    const hasContent = Boolean(
      parsed.summary?.trim() ||
      parsed.experience.length ||
      parsed.projects.length ||
      parsed.education.length ||
      parsed.skills.length
    )
    if (!hasContent) {
      setImportStatus('No structured sections detected in the uploaded resume.')
      return
    }
    setParsedResume(parsed)
    setRawBlocks(parsed.blocks)
    setSelectedBlocks(Object.fromEntries(parsed.blocks.map((block) => [block.id, true])))
    setImportStatus(summarizeParsed(parsed, 'Tap “Select what you need” to choose what stays.'))
    if (openModal) setImportModalOpen(true)
  }

  const handleFile = async (file: File, kind: 'resume' | 'jd') => {
    const ext = (file.name.split('.').pop() || '').toLowerCase()
    const isImg = file.type.startsWith('image/') || ['png','jpg','jpeg'].includes(ext)
    const text = isImg && kind === 'jd' ? '' : await parseUnknown(file)
    if (kind === 'resume') {
      const dataUrl = await fileToDataUrl(file)
      setAttachments({ existingResumeText: text, existingResumeFile: { name: file.name, type: file.type, dataUrl } })
      setResumeName(file.name)
      setPreviewResume(text.slice(0, 4000))
      setShowResumePreview(true)
      // Do NOT auto-import parsed sections; user can import manually.
      setImportStatus('')
      if (text.trim()) {
        parseResumeText(text, { openModal: false })
      }
    } else {
      const dataUrl = await fileToDataUrl(file)
      // Set image preview immediately, then OCR in background
      setAttachments({ jobDescriptionFile: { name: file.name, type: file.type, dataUrl } })
      setJdName(file.name)
      if (isImg) {
        setPreviewJD('')
        parseImage(file)
          .then((ocr) => {
            setAttachments({ jobDescriptionText: ocr })
            setPreviewJD((ocr || '').slice(0, 4000))
          })
          .catch(() => {})
      } else {
        setAttachments({ jobDescriptionText: text })
        setPreviewJD((text || '').slice(0, 4000))
      }
    }
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {!hasInstructions && (attachments.existingResumeFile || attachments.existingResumeText || attachments.jobDescriptionFile || attachments.jobDescriptionText) && (
        <div className="md:col-span-2">
          <div className="mb-4 flex flex-col gap-2 rounded border border-brand-200 bg-brand-50/70 p-3 text-xs text-brand-900 dark:border-brand-800 dark:bg-brand-900/30 dark:text-brand-100">
            <strong className="text-[10px] uppercase tracking-wide text-brand-700">Next step</strong>
            <span>You’ve added source material. Head to the Instructions tab to tell the AI what to emphasize or avoid.</span>
            <div>
              <button
                className="btn h-8 px-3 text-xs"
                onClick={() => {
                  setStep('instructions')
                  document.getElementById('instructions-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                }}
              >
                Add Instructions
              </button>
            </div>
          </div>
        </div>
      )}
      <div id="tour-upload-resume">
        <Uploader label="Existing Resume (PDF/DOCX)" filename={resumeName} onFile={(f) => handleFile(f, 'resume')} />
      </div>
      <Uploader label="Job Description (PDF/DOCX/TXT/PNG/JPG)" filename={jdName} onFile={(f) => handleFile(f, 'jd')} />
      <div className="md:col-span-2">
        <label className="block text-sm font-medium" htmlFor="jd-textarea">Or paste job description text</label>
        <textarea
          id="jd-textarea"
          className="input mt-1 h-32 resize-y"
          placeholder="Paste job description details here"
          value={jobDescriptionText}
          onChange={(e) => {
            const text = e.target.value
            setAttachments({ jobDescriptionText: text })
          }}
        />
        <p className="mt-1 text-xs text-gray-500">Supports up to ~50k characters. Uploading a file is optional when pasting.</p>
      </div>
      {previewResume && (
        <div className="md:col-span-2">
          {showResumePreview ? (
            <div className="card">
              <div className="mb-2 flex items-center justify-between text-sm font-semibold">
                <span>Resume Preview (first 4000 chars)</span>
                <button className="btn h-8 px-3 text-xs" onClick={() => setShowResumePreview(false)}>Hide preview</button>
              </div>
              <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded bg-white p-3 text-xs text-gray-700 dark:bg-gray-900 dark:text-gray-200">{previewResume}</pre>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
                {importStatus && (
                  <span className="rounded bg-slate-100 px-2 py-1 text-slate-700 dark:bg-gray-900/40 dark:text-gray-200">{importStatus}</span>
                )}
                <button
                  className="btn"
                  onClick={() => {
                    const text = attachments.existingResumeText || ''
                    if (!text.trim()) {
                      setImportStatus('No text detected in the uploaded resume. Try uploading a PDF/DOCX or ensure OCR completed.')
                      return
                    }
                    if (rawBlocks.length) setImportModalOpen(true)
                    else parseResumeText(text, { openModal: true })
                  }}
                >
                  Select what you need
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:border-gray-700 dark:bg-gray-800/60 dark:text-gray-200">
              <div className="flex items-center justify-between gap-2">
                <span>Resume preview hidden</span>
                <button className="btn h-8 px-3 text-xs" onClick={() => setShowResumePreview(true)}>Show preview</button>
              </div>
              {importStatus && (
                <p className="mt-2 rounded bg-slate-100 px-2 py-1 text-slate-700 dark:bg-gray-900/40 dark:text-gray-200">{importStatus}</p>
              )}
            </div>
          )}
        </div>
      )}
      <JDPreview text={previewJD} />
      <ImportSelectionModal
        open={importModalOpen}
        blocks={rawBlocks}
        selectedBlocks={selectedBlocks}
        setSelectedBlocks={setSelectedBlocks}
        onClose={() => setImportModalOpen(false)}
        onImport={() => {
          const chosen = rawBlocks.filter((block) => selectedBlocks[block.id])
          if (!chosen.length) {
            setImportStatus('No sections selected to import.')
            setImportModalOpen(false)
            return
          }
          const joined = chosen.map((block) => block.text).join('\n')
          const parsed = extractFromResumeText(joined)
          mergeParsedSections({
            summary: parsed.summary,
            experience: parsed.experience,
            projects: parsed.projects,
            education: parsed.education,
            skills: parsed.skills,
          })
          setImportStatus(summarizeParsed(parsed, 'Selections applied.'))
          setImportModalOpen(false)
        }}
      />
    </div>
  )
}

function Uploader({ label, onFile, filename }: { label: string; onFile: (f: File) => void; filename?: string }) {
  const [drag, setDrag] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  return (
    <div>
      <label className="block text-sm font-medium">{label}</label>
      <div
        className={`mt-1 flex h-28 w-full cursor-pointer items-center justify-center rounded-lg border text-sm shadow-sm ${drag ? 'border-brand-600 bg-brand-50' : 'border-gray-300 border-dashed hover:bg-gray-50'}`}
        onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault(); setDrag(false)
          const f = e.dataTransfer.files?.[0]
          if (f) onFile(f)
        }}
        onClick={() => inputRef.current?.click()}
      >
        {filename ? <span className="text-gray-700">{filename}</span> : <span className="text-gray-500">Drag & drop or click to upload</span>}
        <input
          ref={inputRef}
          type="file"
          hidden
          accept="application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,image/png,image/jpeg"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) onFile(f)
          }}
        />
      </div>
    </div>
  )
}

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function JDPreview({ text }: { text: string }) {
  const file = useResumeStore((s) => s.attachments.jobDescriptionFile)
  if (!file && !text) return null
  const isImg = !!file && /image\//.test(file.type)
  return (
    <div className="card md:col-span-2">
      <div className="mb-2 text-sm font-semibold">Job Description Preview {file ? <span className="ml-2 text-xs font-normal text-gray-500">({file.name} — {file.type || 'unknown'})</span> : null}</div>
      {isImg && (
        <div className="mb-2">
          <img src={file!.dataUrl} alt="JD screenshot" className="max-h-60 w-auto rounded border" />
        </div>
      )}
      {text ? (
        <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded bg-white p-3 text-xs text-gray-700 dark:bg-gray-900 dark:text-gray-200">{text}</pre>
      ) : (
        <div className="rounded border bg-white p-3 text-xs text-gray-600">OCR is loading… If this takes long, try a higher‑contrast screenshot or upload as PDF.</div>
      )}
    </div>
  )
}

function ImportSelectionModal({
  open,
  onClose,
  blocks,
  selectedBlocks,
  setSelectedBlocks,
  onImport,
}: {
  open: boolean
  onClose: () => void
  blocks: ParsedResumeBlock[]
  selectedBlocks: Record<string, boolean>
  setSelectedBlocks: (value: Record<string, boolean>) => void
  onImport: () => void
}) {
  const toggle = (id: string, value: boolean) => {
    setSelectedBlocks({ ...selectedBlocks, [id]: value })
  }

  const allSelected = blocks.length ? blocks.every((block) => selectedBlocks[block.id]) : false
  const anySelected = blocks.some((block) => selectedBlocks[block.id])

  const setAll = (value: boolean) => {
    setSelectedBlocks(Object.fromEntries(blocks.map((block) => [block.id, value])))
  }

  return (
    <Modal open={open} title="Pick what stays" onClose={onClose}>
      <div className="space-y-4 text-sm">
        <p className="text-xs text-gray-600 dark:text-gray-300">
          These snippets come straight from your upload. Toggle anything you don’t want the AI to rewrite.
        </p>
        {blocks.length ? (
          <>
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium">Original text blocks ({blocks.length})</span>
              <div className="flex gap-2 text-xs">
                <button className="btn btn-sm" onClick={() => setAll(true)} disabled={allSelected}>Select all</button>
                <button className="btn btn-sm" onClick={() => setAll(false)} disabled={!anySelected}>Clear all</button>
              </div>
            </div>
            <div className="max-h-[55vh] space-y-2 overflow-auto pr-1">
              {blocks.map((block) => {
                const checked = Boolean(selectedBlocks[block.id])
                const accent = block.kind === 'heading' ? 'border-brand-400' : block.kind === 'bullet' ? 'border-emerald-300' : 'border-slate-200'
                return (
                  <label
                    key={block.id}
                    className={`flex gap-3 rounded-lg border p-3 text-left transition hover:border-brand-300 dark:border-slate-700 dark:hover:border-brand-500 ${checked ? 'bg-brand-50/60 dark:bg-brand-900/20 border-brand-300' : accent}`}
                  >
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={checked}
                      onChange={(e) => toggle(block.id, e.target.checked)}
                    />
                    <div className="max-h-48 w-full overflow-auto whitespace-pre-line break-words text-xs leading-relaxed text-gray-700 dark:text-gray-200">
                      {block.text}
                    </div>
                  </label>
                )
              })}
            </div>
            <div className="flex items-center justify-between border-t pt-3">
              <button className="btn" onClick={onClose}>Cancel</button>
              <button className="btn btn-primary" onClick={onImport} disabled={!anySelected}>
                {anySelected ? 'Import selected' : 'Select text to import'}
              </button>
            </div>
          </>
        ) : (
          <div className="rounded border border-dashed border-slate-300 p-4 text-xs text-gray-500 dark:border-slate-700 dark:text-gray-300">
            No text blocks were detected in this file.
          </div>
        )}
      </div>
    </Modal>
  )
}
