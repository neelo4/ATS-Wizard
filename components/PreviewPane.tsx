"use client"
import { useEffect, useRef, useState } from 'react'
import { snapshot, useResumeStore } from '@/lib/store'
import { generateResumeDraft } from '@/lib/ai'
import { ResumeDocument } from '@/lib/templates'
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
    attachments: s.attachments,
    instructions: s.instructions,
    template: s.template,
    style: s.style,
  }))
  const [gen, setGen] = useState<GeneratedResume | null>(null)
  const [loading, setLoading] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const [showBasics, setShowBasics] = useState(false)
  const [showSignIn, setShowSignIn] = useState(false)
  const { user, signIn } = useAuth()

  async function runGenerate() {
    setLoading(true)
    try {
      const out = await generateResumeDraft(snapshot())
      setGen(out)
    } catch (e) {
      console.error(e)
      alert('Generation failed. See console for details.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Rerender occurs automatically via store selection
  }, [data.template])

  const basics = useResumeStore((s) => s.basics)
  const seedExample = useResumeStore((s) => s.seedExample)
  const setBasics = useResumeStore((s) => s.setBasics)

  const emptyState = !basics.fullName && !basics.email

  return (
    <div className="space-y-3">
      <Modal open={showBasics} title="Tell us the basics" onClose={() => setShowBasics(false)}>
        <BasicsForm onClose={() => setShowBasics(false)} />
      </Modal>
      <SignInModal open={showSignIn} onClose={() => setShowSignIn(false)} />
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-700">Template</div>
        <div className="flex gap-2">
          <button id="tour-generate" className="btn btn-primary" onClick={runGenerate} disabled={loading}>
            {loading ? 'Generating…' : 'Generate with AI'}
          </button>
          <button
            id="tour-download"
            className="btn"
            disabled={!gen}
            onClick={() => {
              if (!gen) return
              try {
                localStorage.setItem('resume-print-payload', JSON.stringify({ data, gen }))
                window.open('/print', '_blank')
              } catch (e) {
                console.error(e)
                alert('Could not prepare PDF. Please allow popups and try again.')
              }
            }}
          >
            Download Resume
          </button>
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
      <div ref={ref} className="bg-gray-50 p-4 print:bg-white">
        {gen ? (
          <div id="resume-print">
            <ResumeDocument data={data} generated={gen} view="screen" />
          </div>
        ) : (
          <div className="rounded border bg-white p-6 text-sm text-gray-500">
            Click "Generate with AI" to preview your tailored resume.
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
