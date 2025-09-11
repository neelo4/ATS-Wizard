"use client"
import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth'
import Tour from '@/components/Tour'
import Confetti from '@/components/Confetti'

export default function TourController() {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [celebrate, setCelebrate] = useState(false)

  useEffect(() => {
    if (!user) return
    const key = `tour-seen:${user.id}`
    const seen = localStorage.getItem(key)
    if (!seen) {
      setTimeout(() => setOpen(true), 300) // let UI settle
    }
    function onManualOpen() { setOpen(true) }
    window.addEventListener('resume-open-tour', onManualOpen as any)
    return () => window.removeEventListener('resume-open-tour', onManualOpen as any)
  }, [user])

  if (!user) return null

  const key = `tour-seen:${user.id}`
  const steps = [
    { id: 'steps', selector: '#tour-steps', title: 'Navigate steps', body: 'Move through Basics, Experience, Projects, Uploads, Instructions, and Preview.' },
    { id: 'template', selector: '#tour-template', title: 'Choose a format', body: 'Pick Modern, Classic, or Vibrant. These change the layout and structure.' },
    { id: 'style', selector: '#tour-style', title: 'Style it', body: 'Choose font and accent color for the resume. Vibrant no longer forces a blue header — you decide the look.' },
    { id: 'theme', selector: '#tour-theme', title: 'Light or Dark', body: 'Toggle the app theme. The resume itself stays print‑friendly regardless of theme.' },
    { id: 'name', selector: '#tour-name', title: 'Start with your name', body: 'Enter your full name and email. You can also click “Ask Me Basics”.' },
    { id: 'upload', selector: '#tour-upload-resume', title: 'Attach your resume/JD', body: 'Upload your existing resume and the job description. We parse them to tailor your result.' },
    { id: 'goals', selector: '#tour-goals', title: 'Set goals', body: 'Add goals like “Pass ATS” or “Backend focus”. These guide the AI generation.' },
    { id: 'generate', selector: '#tour-generate', title: 'Generate', body: 'Click “Generate with AI” to produce a tailored resume with a live preview and ATS score.' },
    { id: 'download', selector: '#tour-download', title: 'Download', body: 'Save your resume as a clean PDF. Only the resume content is exported.' },
  ]

  return (
    <>
      {open && (
        <Tour
          steps={steps}
          onClose={() => setOpen(false)}
          onDone={() => { localStorage.setItem(key, '1'); setOpen(false); setCelebrate(true); setTimeout(() => setCelebrate(false), 4200) }}
        />
      )}
      {celebrate && <Confetti duration={4000} />}
    </>
  )
}
