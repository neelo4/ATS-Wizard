"use client"
import { useEffect, useState } from 'react'
import { StepsNav, type StepKey } from '@/components/StepsNav'
import BasicDetailsForm from '@/components/BasicDetailsForm'
import ExperienceForm from '@/components/ExperienceForm'
import ProjectsForm from '@/components/ProjectsForm'
import UploadsForm from '@/components/UploadsForm'
import InstructionsForm from '@/components/InstructionsForm'
import TemplatePicker from '@/components/TemplatePicker'
import PreviewPane from '@/components/PreviewPane'
import ThemeToggle from '@/components/ThemeToggle'
import Marquee from '@/components/Marquee'
import AuthButton from '@/components/AuthButton'
import AuthGate from '@/components/AuthGate'
import TourController from '@/components/TourController'
import GuideButton from '@/components/GuideButton'
import { useResumeStore } from '@/lib/store'

export default function HomePage() {
  const [step, setStep] = useState<StepKey>('details')
  const basics = useResumeStore((s) => s.basics)
  const hasBasics = Boolean(basics.fullName && basics.email)
  return (
    <main className="container py-8">
      <AuthGate />
      <TourController />
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold">JobFit Wizard</h1>
          <Marquee text="Attach your details, upload JD/resume, and generate a tailored resume." />
        </div>
        <div className="flex items-center gap-2">
          <TemplatePicker />
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
        {step === 'experience' && <Card title="Experience"><ExperienceForm /></Card>}
        {step === 'projects' && <Card title="Projects"><ProjectsForm /></Card>}
        {step === 'uploads' && <Card title="Uploads"><UploadsForm /></Card>}
        {step === 'instructions' && <Card title="Instructions"><InstructionsForm /></Card>}

        {(hasBasics || step === 'preview') && (
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
