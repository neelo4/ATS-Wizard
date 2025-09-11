"use client"
import { useResumeStore } from '@/lib/store'
import { LayoutTemplate } from 'lucide-react'

export default function TemplatePicker() {
  const template = useResumeStore((s) => s.template)
  const setTemplate = useResumeStore((s) => s.setTemplate)
  return (
    <div id="tour-template" className="segmented" role="tablist" aria-label="Template picker">
      <button data-active={template === 'modern'} onClick={() => setTemplate('modern')}>Modern</button>
      <button data-active={template === 'classic'} onClick={() => setTemplate('classic')}>Classic</button>
      <button data-active={template === 'vibrant'} onClick={() => setTemplate('vibrant')}>Vibrant</button>
    </div>
  )
}
