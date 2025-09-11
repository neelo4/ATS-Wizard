"use client"
import { HelpCircle } from 'lucide-react'

export default function GuideButton() {
  return (
    <button
      className="btn"
      onClick={() => {
        try {
          window.dispatchEvent(new CustomEvent('resume-open-tour'))
        } catch (e) {
          console.error(e)
        }
      }}
      title="Replay the guided tour"
    >
      <HelpCircle size={16} /> Guide
    </button>
  )
}

