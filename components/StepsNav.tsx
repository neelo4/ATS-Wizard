"use client"
import { User2, BriefcaseBusiness, Boxes, Upload, Wand2, Eye } from 'lucide-react'

const steps = [
  { key: 'details', label: 'Basics', icon: User2 },
  { key: 'experience', label: 'Experience', icon: BriefcaseBusiness },
  { key: 'projects', label: 'Projects', icon: Boxes },
  { key: 'uploads', label: 'Uploads', icon: Upload },
  { key: 'instructions', label: 'Instructions', icon: Wand2 },
  { key: 'preview', label: 'Preview', icon: Eye },
] as const

export type StepKey = typeof steps[number]['key']

export function StepsNav({ step, onChange }: { step: StepKey; onChange: (s: StepKey) => void }) {
  const palette: Record<StepKey, { base: string; active: string; dark: string }> = {
    details: { base: 'bg-blue-100 border-blue-300 text-blue-900', active: 'bg-blue-200 border-blue-400 text-blue-900', dark: 'dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-200' },
    experience: { base: 'bg-emerald-100 border-emerald-300 text-emerald-900', active: 'bg-emerald-200 border-emerald-400 text-emerald-900', dark: 'dark:bg-emerald-900/30 dark:border-emerald-800 dark:text-emerald-200' },
    projects: { base: 'bg-amber-100 border-amber-300 text-amber-900', active: 'bg-amber-200 border-amber-400 text-amber-900', dark: 'dark:bg-amber-900/30 dark:border-amber-800 dark:text-amber-200' },
    uploads: { base: 'bg-purple-100 border-purple-300 text-purple-900', active: 'bg-purple-200 border-purple-400 text-purple-900', dark: 'dark:bg-purple-900/30 dark:border-purple-800 dark:text-purple-200' },
    instructions: { base: 'bg-rose-100 border-rose-300 text-rose-900', active: 'bg-rose-200 border-rose-400 text-rose-900', dark: 'dark:bg-rose-900/30 dark:border-rose-800 dark:text-rose-200' },
    preview: { base: 'bg-slate-100 border-slate-300 text-slate-900', active: 'bg-slate-200 border-slate-400 text-slate-900', dark: 'dark:bg-slate-800/50 dark:border-slate-700 dark:text-slate-200' },
  }

  return (
    <nav id="tour-steps" className="no-scrollbar -mx-2 flex flex-nowrap gap-2 overflow-x-auto px-2">
      {steps.map((s) => {
        const Icon = s.icon as any
        const active = s.key === step
        const colors = palette[s.key]
        return (
          <button
            key={s.key}
            data-active={active}
            onClick={() => onChange(s.key as StepKey)}
            className={`btn-step shrink-0 ${active ? colors.active : colors.base} ${colors.dark}`}
          >
            <Icon size={14} />
            {s.label}
          </button>
        )
      })}
    </nav>
  )
}
