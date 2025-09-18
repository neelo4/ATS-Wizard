"use client"
import { useEffect, useRef, useState } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { snapshot, useResumeStore } from '@/lib/store'
import { generateResumeDraft } from '@/lib/ai'
import { ResumeDocument } from '@/lib/templates'
import TemplatePicker from '@/components/TemplatePicker'
import StylePicker from '@/components/StylePicker'
import { downloadRefinedDocx } from '@/lib/exportDocx'
import type { GeneratedResume } from '@/lib/types'
import Modal from '@/components/ui/Modal'
import { useAuth } from '@/lib/auth'
import { loadResume } from '@/lib/persistence'

export default function PreviewPane() {
  // Derive live data from the store so template/content changes reflect instantly
  const data = useResumeStore((s) => ({
    basics: s.basics,
    experience: s.experience,
    projects: s.projects,
    education: s.education,
    skills: s.skills,
    attachments: s.attachments,
    instructions: s.instructions,
    template: s.template,
    style: s.style,
  }))
  const [gen, setGen] = useState<GeneratedResume | null>(null)
  const [loading, setLoading] = useState(false)
  const [phase, setPhase] = useState<'idle' | 'contacting' | 'drafting' | 'done'>('idle')
  const [progress, setProgress] = useState(0)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [statusContext, setStatusContext] = useState<'manual' | 'instructions' | null>(null)
  const [pendingInstructions, setPendingInstructions] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const [showBasics, setShowBasics] = useState(false)
  const [showSignIn, setShowSignIn] = useState(false)
  const [showEditor, setShowEditor] = useState(false)
  const { user, signIn } = useAuth()
  const instructionsVersion = useResumeStore((s) => s.instructionsVersion)
  const instructions = useResumeStore((s) => s.instructions)
  const lastAppliedVersion = useRef(instructionsVersion)

  async function runGenerate(reason: 'manual' | 'instructions' = 'manual') {
    if (loading) return
    lastAppliedVersion.current = instructionsVersion
    setStatusContext(reason)
    setStatusMessage(reason === 'instructions' ? 'Applying your latest instructions…' : 'Generating an AI-tailored resume…')
    setPendingInstructions(false)
    setLoading(true)
    setPhase('contacting')
    setProgress(12)
    let completed = false
    const stepTargets = [28, 44, 61, 78]
    let stepIndex = 0
    let pulse: ReturnType<typeof setInterval> | null = null
    const stopPulse = () => { if (pulse) window.clearInterval(pulse); pulse = null }
    pulse = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 82) return prev
        const next = stepTargets[Math.min(stepIndex, stepTargets.length - 1)]
        stepIndex += 1
        return Math.max(prev, next)
      })
    }, 420)

    try {
      const out = await generateResumeDraft(snapshot())
      setPhase('drafting')
      setProgress((prev) => Math.max(prev, 92))
      setGen(out)
      applyGenerated(out)
      ;(window as any).___lastGen = out
      completed = true
      stopPulse()
      setProgress(100)
      setPhase('done')
      setStatusMessage('Resume ready! Latest edits applied.')
      setStatusContext(null)
      window.setTimeout(() => {
        setProgress(0)
        setPhase('idle')
        setStatusMessage(null)
      }, 1200)
    } catch (e) {
      console.error(e)
      alert('Generation failed. See console for details.')
      setStatusMessage('Generation failed. Please try again.')
      setStatusContext(null)
    } finally {
      stopPulse()
      setLoading(false)
      if (!completed) {
        setPhase('idle')
        setProgress(0)
        setPendingInstructions(true)
      }
    }
  }

  useEffect(() => {
    // Rerender occurs automatically via store selection
  }, [data.template])

  const basics = useResumeStore((s) => s.basics)
  const seedExample = useResumeStore((s) => s.seedExample)
  const setBasics = useResumeStore((s) => s.setBasics)
  const applyGenerated = useResumeStore((s) => s.applyGenerated)
  const mode = useResumeStore((s) => s.mode)
  const setMode = useResumeStore((s) => s.setMode)
  const setStep = useResumeStore((s) => s.setStep)
  const attachments = useResumeStore((s) => s.attachments)
  const hasUpload = Boolean(
    attachments.existingResumeFile || attachments.existingResumeText || attachments.jobDescriptionFile || attachments.jobDescriptionText
  )
  const hasBasics = Boolean(basics.fullName && basics.email)
  const canGenerate = hasUpload || hasBasics
  const hasInstructions = Boolean(
    (instructions.prompt && instructions.prompt.trim()) ||
    (instructions.goals && instructions.goals.length) ||
    (instructions.keywords && instructions.keywords.length) ||
    (instructions.constraints && instructions.constraints.length)
  )
  const hasReadyContent = Boolean(data.experience.length || data.projects.length || attachments.jobDescriptionText || attachments.existingResumeText)

  const emptyState = !basics.fullName && !basics.email

  useEffect(() => {
    if (instructionsVersion !== lastAppliedVersion.current) {
      setPendingInstructions(true)
      if (!loading) {
        setStatusContext('instructions')
        setStatusMessage('New instructions saved. Generate to apply them.')
      }
    }
  }, [instructionsVersion, loading])

  return (
    <div className="space-y-3">
      <Modal open={showBasics} title="Tell us the basics" onClose={() => setShowBasics(false)}>
        <BasicsForm onClose={() => setShowBasics(false)} />
      </Modal>
      <SignInModal open={showSignIn} onClose={() => setShowSignIn(false)} />
      <Modal open={showEditor} title="Edit Generated Resume" onClose={() => setShowEditor(false)}>
        <ResumeContentEditor
          generated={gen}
          onCancel={() => setShowEditor(false)}
          onApply={(updated) => {
            setGen(updated)
            setShowEditor(false)
          }}
        />
      </Modal>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded border border-slate-200 bg-white/70 p-3 dark:border-slate-700 dark:bg-slate-800/70">
        <div className="flex flex-wrap items-center gap-3">
          <TemplatePicker />
          <StylePicker />
        </div>
        <div className="text-xs text-slate-500 dark:text-slate-300">Switch layout or accent before downloading.</div>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-700 flex items-center gap-3">
          <span>Template</span>
          {attachments.existingResumeFile && (
            <div className="segmented">
              <button data-active={mode === 'original'} onClick={() => setMode('original')}>Original</button>
              <button data-active={mode === 'refined'} onClick={() => setMode('refined')}>Refined</button>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          {mode === 'refined' ? (
            <>
              {pendingInstructions && !loading && (
                <span className="self-center rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-700">
                  Instructions updated
                </span>
              )}
              <button id="tour-generate" className="btn btn-primary" onClick={() => runGenerate('manual')} disabled={loading || !canGenerate}>
                {loading ? 'Generating…' : 'Generate with AI'}
              </button>
              <button id="tour-download" className="btn" disabled={!gen} onClick={() => downloadRefined()}>Download PDF</button>
              {attachments.existingResumeFile && /\.docx$/i.test(attachments.existingResumeFile.name) && (
                <button className="btn" disabled={!gen} onClick={() => gen && downloadRefinedDocx(`${(data.basics.fullName || 'Resume').replace(/\s+/g,'_')}-refined.docx`, data, gen)}>Download Refined (DOCX)</button>
              )}
            </>
          ) : (
            <>
              <button className="btn" onClick={downloadOriginal} disabled={!attachments.existingResumeFile}>Download Original</button>
              <button className="btn" onClick={() => setMode('refined')}>Switch to Refined</button>
              <button className="btn btn-primary" onClick={() => { setMode('refined'); runGenerate('manual') }} disabled={loading || !canGenerate}>
                {loading ? 'Generating…' : 'Generate with AI'}
              </button>
            </>
          )}
        </div>
      </div>
      {emptyState && (
        <div className="rounded border border-slate-200 bg-slate-50/60 p-3 text-sm text-slate-800 dark:border-gray-700 dark:bg-gray-800/60 dark:text-gray-200">
          Quick start: Enter your name and email to personalize, or click “Generate with AI” to create a baseline resume from your inputs/JD.
          <div className="mt-2 flex gap-2">
            <button
              className="btn btn-outline"
              onClick={() => setShowBasics(true)}
            >
              Ask Me Basics
            </button>
            <button
              className="btn"
              onClick={() => seedExample()}
            >
              Add Example Sections
            </button>
            {!user && (
              <button className="btn" onClick={() => setShowSignIn(true)}>Sign in to Save</button>
            )}
          </div>
        </div>
      )}
      {!emptyState && hasReadyContent && !hasInstructions && (
        <div className="rounded border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-900/40 dark:text-amber-100">
          <strong className="mr-2 uppercase tracking-wide text-[10px]">Next step</strong>
          Give the AI pointers about tone, keywords, or constraints so it can tailor the resume.
          <button
            className="ml-3 inline-flex items-center text-amber-900 underline hover:opacity-80 dark:text-amber-200"
            onClick={() => {
              setStep('instructions')
              document.getElementById('instructions-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
            }}
          >
            Add instructions
          </button>
        </div>
      )}
      {(phase !== 'idle' || statusMessage) && (
        <div className="rounded-md border border-slate-200 bg-white p-3 text-xs text-gray-600 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-gray-200">
          <div className="mb-2 flex items-center justify-between font-medium">
            <span>
              {phase === 'contacting' && 'Syncing your profile and inputs…'}
              {phase === 'drafting' && 'Crafting fresh bullet points…'}
              {phase === 'done' && (
                <span className="inline-flex items-center gap-1 text-emerald-600">
                  <CheckCircle2 size={14} /> Resume ready!
                </span>
              )}
              {phase === 'idle' && statusMessage && statusContext === 'instructions' && 'Applying your latest instructions…'}
            </span>
            {phase !== 'idle' && <span>{Math.round(progress)}%</span>}
          </div>
          {statusMessage && (
            <p className="mb-2 text-[11px] text-slate-500">
              {statusMessage}
              {statusContext === 'instructions' && instructions.prompt && (
                <span className="ml-1 italic text-slate-400">“{instructions.prompt.slice(0, 120)}{instructions.prompt.length > 120 ? '…' : ''}”</span>
              )}
            </p>
          )}
          <div className="h-1.5 w-full overflow-hidden rounded bg-slate-200 dark:bg-slate-700">
            <div
              className="h-full rounded bg-brand-500 transition-all duration-200"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
        </div>
      )}
      <div ref={ref} className="relative bg-gray-50 p-4 print:bg-white">
        {gen && (
          <button
            className="btn absolute right-4 top-4 z-10 print:hidden"
            onClick={() => setShowEditor(true)}
          >
            Edit Generated Content
          </button>
        )}
        {mode === 'original' && attachments.existingResumeFile ? (
          <OriginalViewer file={attachments.existingResumeFile} fallbackText={attachments.existingResumeText || ''} />
        ) : gen ? (
          <div id="resume-print">
            <ResumeDocument data={data} generated={gen} view="screen" />
          </div>
        ) : (
          <div className="rounded border bg-white p-6 text-sm text-gray-500">
            {attachments.existingResumeFile || attachments.existingResumeText || attachments.jobDescriptionFile || attachments.jobDescriptionText
              ? 'Switch to Refined and click Generate with AI to apply instructions.'
              : 'Upload a Resume/JD or fill Basics (name + email) to enable Generate with AI.'}
          </div>
        )}
      </div>
    </div>
  )
}

function Input({ label, value, onChange, type = 'text', required = false }: { label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean }) {
  return (
    <div>
      <label className="block text-sm font-medium">
        {label}
        {required && <span className="ml-1 text-red-600">*</span>}
      </label>
      <input
        type={type}
        className="mt-1 w-full rounded border px-3 py-2 text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}

function SignInModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { signIn } = useAuth()
  const setBasics = useResumeStore((s) => s.setBasics)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  return (
    <Modal open={open} title="Sign in" onClose={onClose}>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault()
          if (!email.trim()) return
          const id = email.trim().toLowerCase()
          signIn({ id, name: name.trim() || 'User', email: id })
          try {
            const existing = loadResume(id)
            if (!existing) { setBasics({ fullName: name, email }) }
          } catch {}
          onClose()
        }}
      >
        <Input label="Name" value={name} onChange={setName} />
        <Input label="Email" value={email} onChange={setEmail} type="email" required />
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary">Continue</button>
        </div>
        
      </form>
    </Modal>
  )
}

function BasicsForm({ onClose }: { onClose: () => void }) {
  const basics = useResumeStore((s) => s.basics)
  const setBasics = useResumeStore((s) => s.setBasics)
  const [name, setName] = useState(basics.fullName)
  const [email, setEmail] = useState(basics.email)
  const [phone, setPhone] = useState(basics.phone || '')

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault()
        setBasics({ fullName: name.trim(), email: email.trim() })
        onClose()
      }}
    >
      <Input label="Full Name" value={name} onChange={setName} required />
      <Input label="Email" value={email} onChange={setEmail} type="email" required />
      <Input label="Phone" value={phone} onChange={setPhone} type="tel" />
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" className="btn" onClick={onClose}>Cancel</button>
        <button type="submit" className="btn btn-primary">Save</button>
      </div>
    </form>
  )
}

function ResumeContentEditor({ generated, onCancel, onApply }: { generated: GeneratedResume | null; onCancel: () => void; onApply: (updated: GeneratedResume) => void }) {
  const basics = useResumeStore((s) => s.basics)
  const setBasics = useResumeStore((s) => s.setBasics)
  const skills = useResumeStore((s) => s.skills)
  const setSkills = useResumeStore((s) => s.setSkills)
  const experience = useResumeStore((s) => s.experience)
  const updateExperience = useResumeStore((s) => s.updateExperience)
  const projects = useResumeStore((s) => s.projects)
  const updateProject = useResumeStore((s) => s.updateProject)

  const [summary, setSummary] = useState(basics.summary || '')
  const [skillInput, setSkillInput] = useState(skills.join('\n'))
  const [experienceDraft, setExperienceDraft] = useState(() =>
    experience.map((entry) => ({
      id: entry.id,
      role: entry.role || '',
      company: entry.company || '',
      achievements: (entry.achievements || []).join('\n'),
    }))
  )
  const [projectDraft, setProjectDraft] = useState(() =>
    projects.map((entry) => ({
      id: entry.id,
      name: entry.name || '',
      summary: entry.summary || '',
      highlights: (entry.highlights || []).join('\n'),
    }))
  )

  useEffect(() => {
    setSummary(basics.summary || '')
  }, [basics.summary])

  useEffect(() => {
    setSkillInput(skills.join('\n'))
  }, [skills])

  useEffect(() => {
    setExperienceDraft(
      experience.map((entry) => ({
        id: entry.id,
        role: entry.role || '',
        company: entry.company || '',
        achievements: (entry.achievements || []).join('\n'),
      }))
    )
  }, [experience])

  useEffect(() => {
    setProjectDraft(
      projects.map((entry) => ({
        id: entry.id,
        name: entry.name || '',
        summary: entry.summary || '',
        highlights: (entry.highlights || []).join('\n'),
      }))
    )
  }, [projects])

  const handleSave = () => {
    setBasics({ summary: summary.trim() })
    const parsedSkills = skillInput
      .split(/\n|,/)
      .map((value) => value.trim())
      .filter(Boolean)
    setSkills(parsedSkills)

    experienceDraft.forEach((entry) => {
      const achievements = entry.achievements
        .split(/\n+/)
        .map((line) => line.trim())
        .filter(Boolean)
      updateExperience(entry.id, {
        role: entry.role.trim(),
        company: entry.company.trim(),
        achievements,
      })
    })

    projectDraft.forEach((entry) => {
      const highlights = entry.highlights
        .split(/\n+/)
        .map((line) => line.trim())
        .filter(Boolean)
      updateProject(entry.id, {
        name: entry.name.trim(),
        summary: entry.summary.trim(),
        highlights,
      })
    })

    const state = useResumeStore.getState()
    const updated: GeneratedResume = {
      sections: {
        summary: state.basics.summary || '',
        skills: state.skills,
        experience: state.experience,
        projects: state.projects,
        education: generated?.sections.education || state.education,
      },
      atsScore: generated?.atsScore,
      matchedKeywords: generated?.matchedKeywords,
    }

    onApply(updated)
  }

  return (
    <div className="flex max-h-[70vh] flex-col gap-4 overflow-auto pr-1">
      <section>
        <h3 className="text-sm font-semibold text-gray-800">Profile Summary</h3>
        <textarea
          className="input mt-2 h-28 resize-y"
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
        />
      </section>
      <section>
        <h3 className="text-sm font-semibold text-gray-800">Skills (one per line)</h3>
        <textarea
          className="input mt-2 h-32 resize-y"
          value={skillInput}
          onChange={(e) => setSkillInput(e.target.value)}
        />
      </section>
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-800">Experience Bullets</h3>
        {experienceDraft.map((entry, idx) => (
          <div key={entry.id} className="rounded border border-slate-200 p-3">
            <div className="grid gap-2 md:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-slate-600">Role</label>
                <input
                  className="input mt-1"
                  value={entry.role}
                  onChange={(e) => {
                    const next = experienceDraft.slice()
                    next[idx] = { ...entry, role: e.target.value }
                    setExperienceDraft(next)
                  }}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600">Company</label>
                <input
                  className="input mt-1"
                  value={entry.company}
                  onChange={(e) => {
                    const next = experienceDraft.slice()
                    next[idx] = { ...entry, company: e.target.value }
                    setExperienceDraft(next)
                  }}
                />
              </div>
            </div>
            <label className="mt-3 block text-xs font-medium text-slate-600">Bullets (one per line)</label>
            <textarea
              className="input mt-1 h-32 resize-y"
              value={entry.achievements}
              onChange={(e) => {
                const next = experienceDraft.slice()
                next[idx] = { ...entry, achievements: e.target.value }
                setExperienceDraft(next)
              }}
            />
          </div>
        ))}
      </section>
      {projectDraft.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-800">Project Highlights</h3>
          {projectDraft.map((entry, idx) => (
            <div key={entry.id} className="rounded border border-slate-200 p-3">
              <div>
                <label className="block text-xs font-medium text-slate-600">Project Name</label>
                <input
                  className="input mt-1"
                  value={entry.name}
                  onChange={(e) => {
                    const next = projectDraft.slice()
                    next[idx] = { ...entry, name: e.target.value }
                    setProjectDraft(next)
                  }}
                />
              </div>
              <label className="mt-3 block text-xs font-medium text-slate-600">Summary</label>
              <textarea
                className="input mt-1 h-24 resize-y"
                value={entry.summary}
                onChange={(e) => {
                  const next = projectDraft.slice()
                  next[idx] = { ...entry, summary: e.target.value }
                  setProjectDraft(next)
                }}
              />
              <label className="mt-3 block text-xs font-medium text-slate-600">Highlights (one per line)</label>
              <textarea
                className="input mt-1 h-24 resize-y"
                value={entry.highlights}
                onChange={(e) => {
                  const next = projectDraft.slice()
                  next[idx] = { ...entry, highlights: e.target.value }
                  setProjectDraft(next)
                }}
              />
            </div>
          ))}
        </section>
      )}
      <div className="flex justify-end gap-2 pt-2">
        <button className="btn" onClick={onCancel}>Cancel</button>
        <button className="btn btn-primary" onClick={handleSave}>Save Changes</button>
      </div>
    </div>
  )
}

function OriginalViewer({ file, fallbackText }: { file: { name: string; type: string; dataUrl: string }; fallbackText: string }) {
  const isPdf = /pdf$/i.test(file.type) || /\.pdf$/i.test(file.name)
  if (isPdf) {
    return (
      <div className="rounded border bg-white p-2">
        <object data={file.dataUrl} type="application/pdf" className="h-[70vh] w-full">
          <p className="p-4 text-sm text-gray-600">Cannot preview PDF here. Use Download Original.</p>
        </object>
      </div>
    )
  }
  return (
    <div className="rounded border bg-white p-4">
      <div className="mb-2 text-sm text-gray-600">Preview (first 4000 chars)</div>
      <pre className="max-h-[60vh] overflow-auto whitespace-pre-wrap text-sm text-gray-800">{fallbackText.slice(0, 4000)}</pre>
    </div>
  )
}

function downloadDataUrl(name: string, dataUrl: string) {
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
}

function downloadOriginal() {
  const s = useResumeStore.getState()
  const f = s.attachments.existingResumeFile
  if (!f) return
  downloadDataUrl(f.name, f.dataUrl)
}

async function downloadRefined() {
  const data = snapshot()
  const filename = `${(data.basics.fullName || 'Resume').replace(/\s+/g, '_')}.pdf`
  try {
    await generatePdfInline('resume-print', filename)
    return
  } catch (err) {
    console.warn('[pdf] Inline generation failed, falling back to print view', err)
  }

  try {
    localStorage.setItem('resume-print-payload', JSON.stringify({ data, gen: (window as any).___lastGen || {} }))
    window.open('/print', '_blank')
  } catch (e) {
    console.error(e)
    alert('Could not prepare PDF. Please allow popups and try again.')
  }
}

async function generatePdfInline(elementId: string, filename: string) {
  const html2canvas = await ensureHtml2Canvas()
  const jsPDFNS = await ensureJsPDF()
  const el = document.getElementById(elementId)
  if (!el) throw new Error('resume element missing')
  const canvas = await html2canvas(el, { scale: window.devicePixelRatio > 1 ? window.devicePixelRatio : 2, useCORS: true, backgroundColor: '#ffffff' })
  const imgData = canvas.toDataURL('image/png')
  const pdf = new jsPDFNS.jsPDF('p', 'mm', 'a4')
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const ratio = Math.min(pageWidth / canvas.width, pageHeight / canvas.height)
  const w = canvas.width * ratio
  const h = canvas.height * ratio
  const x = (pageWidth - w) / 2
  const y = 0
  pdf.addImage(imgData, 'PNG', x, y, w, h, undefined, 'FAST')
  pdf.save(filename)
}

const HTML2CANVAS_SRC = 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js'
const JSPDF_SRC = 'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js'
let html2canvasLoader: Promise<any> | null = null
let jsPdfLoader: Promise<any> | null = null

function ensureHtml2Canvas() {
  if (!html2canvasLoader) {
    html2canvasLoader = loadExternalScript(HTML2CANVAS_SRC).then(() => (window as any).html2canvas)
  }
  return html2canvasLoader!
}

function ensureJsPDF() {
  if (!jsPdfLoader) {
    jsPdfLoader = loadExternalScript(JSPDF_SRC).then(() => (window as any).jspdf)
  }
  return jsPdfLoader!
}

function loadExternalScript(src: string) {
  return new Promise<void>((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve()
      return
    }
    const s = document.createElement('script')
    s.src = src
    s.async = true
    s.onload = () => resolve()
    s.onerror = (err) => reject(err)
    document.head.appendChild(s)
  })
}
