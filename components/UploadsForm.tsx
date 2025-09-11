"use client"
import { parseUnknown } from '@/lib/fileParsers'
import { useResumeStore } from '@/lib/store'
import { useEffect, useState } from 'react'
import { extractFromResumeText } from '@/lib/extract'

export default function UploadsForm() {
  const [resumeName, setResumeName] = useState<string>('')
  const [jdName, setJdName] = useState<string>('')
  const [previewResume, setPreviewResume] = useState<string>('')
  const [previewJD, setPreviewJD] = useState<string>('')
  const setAttachments = useResumeStore((s) => s.setAttachments)
  const mergeParsed = useResumeStore((s) => s.mergeParsed)

  const handleFile = async (file: File, kind: 'resume' | 'jd') => {
    const text = await parseUnknown(file)
    if (kind === 'resume') {
      setAttachments({ existingResumeText: text })
      setResumeName(file.name)
      setPreviewResume(text.slice(0, 4000))
      const parsed = extractFromResumeText(text)
      mergeParsed(parsed.experience, parsed.projects)
    } else {
      setAttachments({ jobDescriptionText: text })
      setJdName(file.name)
      setPreviewJD(text.slice(0, 4000))
    }
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <div id="tour-upload-resume">
        <Uploader label="Existing Resume (PDF/DOCX)" filename={resumeName} onFile={(f) => handleFile(f, 'resume')} />
      </div>
      <Uploader label="Job Description (PDF/DOCX/TXT)" filename={jdName} onFile={(f) => handleFile(f, 'jd')} />
      {previewResume && (
        <div className="card md:col-span-2">
          <div className="mb-2 text-sm font-semibold">Resume Preview (first 4000 chars)</div>
          <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded bg-white p-3 text-xs text-gray-700 dark:bg-gray-900 dark:text-gray-200">{previewResume}</pre>
        </div>
      )}
      {previewJD && (
        <div className="card md:col-span-2">
          <div className="mb-2 text-sm font-semibold">Job Description Preview (first 4000 chars)</div>
          <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded bg-white p-3 text-xs text-gray-700 dark:bg-gray-900 dark:text-gray-200">{previewJD}</pre>
        </div>
      )}
    </div>
  )
}

function Uploader({ label, onFile, filename }: { label: string; onFile: (f: File) => void; filename?: string }) {
  const [drag, setDrag] = useState(false)
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
        onClick={() => document.getElementById(label)!.click()}
      >
        {filename ? <span className="text-gray-700">{filename}</span> : <span className="text-gray-500">Drag & drop or click to upload</span>}
        <input id={label} type="file" hidden onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) onFile(f)
        }} />
      </div>
    </div>
  )
}
