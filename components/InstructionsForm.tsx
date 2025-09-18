"use client"
import { useResumeStore } from '@/lib/store'
import { useState } from 'react'

export default function InstructionsForm() {
  const instructions = useResumeStore((s) => s.instructions)
  const setInstructions = useResumeStore((s) => s.setInstructions)
  const bump = useResumeStore((s) => s.bumpInstructionsVersion)
  const experience = useResumeStore((s) => s.experience)
  const projects = useResumeStore((s) => s.projects)
  const attachments = useResumeStore((s) => s.attachments)
  const [saved, setSaved] = useState(false)
  const [editingPrompt, setEditingPrompt] = useState(() => !(instructions.prompt && instructions.prompt.trim()))

  const promptText = instructions.prompt || ''

  const handleApplyPrompt = () => {
    bump()
    setSaved(true)
    setEditingPrompt(false)
    setTimeout(() => setSaved(false), 1800)
  }

  const hasExperience = experience.length > 0
  const hasProjects = projects.length > 0
  const uploadedSource = Boolean(attachments.jobDescriptionText || attachments.existingResumeText || attachments.jobDescriptionFile || attachments.existingResumeFile)

  return (
    <div id="instructions-section" className="grid grid-cols-1 gap-6 md:grid-cols-3">
      <div className="md:col-span-3">
        <OnboardingBanner hasExperience={hasExperience} hasProjects={hasProjects} hasUpload={uploadedSource} />
      </div>
      <div className="md:col-span-3">
        <Box title="Instruction Prompt (free text)">
          {editingPrompt ? (
            <>
              <textarea
                className="input h-24"
                placeholder="Tell the wizard what to emphasize (e.g., emphasize backend, highlight leadership, keep to one page)."
                value={promptText}
                onChange={(e) => {
                  setInstructions({ prompt: e.target.value })
                }}
              />
              <div className="mt-2 flex justify-end">
                <button className="btn btn-primary" onClick={handleApplyPrompt}>Apply Instructions</button>
                {saved && <span className="ml-2 text-sm font-medium text-emerald-600">✔ Saved</span>}
              </div>
            </>
          ) : (
            <div className="flex flex-col gap-2">
              <div className="whitespace-pre-wrap rounded border border-dashed border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                {promptText || 'No prompt added yet.'}
              </div>
              <div className="flex justify-between text-sm text-slate-500">
                <span>{saved ? '✔ Saved' : 'Instructions locked'}</span>
                <button className="btn h-8 px-3 text-xs" onClick={() => {
                  setSaved(false)
                  setEditingPrompt(true)
                }}>Edit</button>
              </div>
            </div>
          )}
        </Box>
      </div>
      
    </div>
  )
}

function Box({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card min-w-0 h-full">
      <div className="text-sm font-semibold text-gray-800">{title}</div>
      <div className="mt-2">{children}</div>
    </div>
  )
}

function OnboardingBanner({ hasExperience, hasProjects, hasUpload }: { hasExperience: boolean; hasProjects: boolean; hasUpload: boolean }) {
  const showReminder = !hasExperience || !hasProjects
  const status = showReminder ? 'incomplete' : 'ready'

  if (status === 'ready' && !hasUpload) {
    return (
      <div className="flex flex-col gap-2 rounded border border-brand-200 bg-brand-50/60 p-3 text-sm text-brand-900 dark:border-brand-800 dark:bg-brand-900/20 dark:text-brand-100">
        <strong className="text-xs uppercase tracking-wide text-brand-700">Next step</strong>
        <span>All core details are in place. Use this page to give the AI a nudge—tell it which accomplishments to highlight, keywords to include, or formatting constraints to follow.</span>
      </div>
    )
  }

  if (status === 'ready' && hasUpload) {
    return (
      <div className="flex flex-col gap-2 rounded border border-emerald-200 bg-emerald-50/70 p-3 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100">
        <strong className="text-xs uppercase tracking-wide text-emerald-700">Dial it in</strong>
        <span>You’ve uploaded context and added your experience. Drop instructions here to tailor the resume—think focus areas, keywords, tone, or any hard requirements.</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2 rounded border border-amber-300 bg-amber-50/70 p-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-900/40 dark:text-amber-100">
      <strong className="text-xs uppercase tracking-wide text-amber-700">Finish your sections first</strong>
      <span>Instructions work best after you add at least one experience and a project. Pop over to those tabs, then come back to tell the AI what to emphasize.</span>
    </div>
  )
}
