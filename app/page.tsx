"use client"
import { useEffect } from 'react'
import { StepsNav } from '@/components/StepsNav'
import BasicDetailsForm from '@/components/BasicDetailsForm'
import ExperienceForm from '@/components/ExperienceForm'
import ProjectsForm from '@/components/ProjectsForm'
import EducationForm from '@/components/EducationForm'
import UploadsForm from '@/components/UploadsForm'
import InstructionsForm from '@/components/InstructionsForm'
import PreviewPane from '@/components/PreviewPane'
import ThemeToggle from '@/components/ThemeToggle'
import Marquee from '@/components/Marquee'
import AuthButton from '@/components/AuthButton'
import AuthGate from '@/components/AuthGate'
import TourController from '@/components/TourController'
import GuideButton from '@/components/GuideButton'
import { useResumeStore } from '@/lib/store'
import { Wand2 } from 'lucide-react'

export default function HomePage() {
  const step = useResumeStore((s) => s.step)
  const setStep = useResumeStore((s) => s.setStep)
  const basics = useResumeStore((s) => s.basics)
  const hasBasics = Boolean(basics.fullName && basics.email)
  const attachments = useResumeStore((s) => s.attachments)
  const setMode = useResumeStore((s) => s.setMode)
  const hasUpload = Boolean(
    attachments.existingResumeFile || attachments.existingResumeText || attachments.jobDescriptionFile || attachments.jobDescriptionText
  )

  function handleRestart() {
    setStep('details')
    setMode('refined')
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }
  return (
    <main className="container py-8">
      <AuthGate />
      <TourController />
      <header className="mb-6 space-y-3">
        <div>
          <button
            type="button"
            className="group inline-flex items-center gap-2 text-2xl font-bold text-gray-900 transition hover:text-blue-600 focus:outline-none focus-visible:ring focus-visible:ring-blue-400/70 dark:text-white dark:hover:text-blue-300"
            onClick={handleRestart}
          >
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-blue-600 transition group-hover:bg-blue-200 dark:bg-blue-900/60 dark:text-blue-200 dark:group-hover:bg-blue-900/70">
              <Wand2 size={18} />
            </span>
            <span>JobFit Wizard</span>
          </button>
          <Marquee text="Attach your details, upload JD/resume, and generate a tailored resume." />
        </div>
        <div className="flex flex-wrap items-center gap-2 overflow-x-auto no-scrollbar">
          <ThemeToggle />
          <GuideButton />
          <AuthButton />
        </div>
      </header>

      <div className="mb-4">
        <StepsNav step={step} onChange={setStep} />
      </div>

      <div className="space-y-6">
        {step === 'details' && <Card title="Basic Details"><BasicDetailsForm /></Card>}
        {step === 'education' && <Card title="Education"><EducationForm /></Card>}
        {step === 'experience' && <Card title="Experience"><ExperienceForm /></Card>}
        {step === 'projects' && <Card title="Projects"><ProjectsForm /></Card>}
        {step === 'uploads' && <Card title="Uploads"><UploadsForm /></Card>}
        {step === 'instructions' && <Card title="Instructions"><InstructionsForm /></Card>}

        {(hasBasics || hasUpload || step === 'preview') && (
          <Card title="Preview & Export">
            <PreviewPane />
          </Card>
        )}
      </div>
    </main>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card">
      <div className="mb-2 text-sm font-semibold text-gray-800">{title}</div>
      {children}
    </section>
  )
}
