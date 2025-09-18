"use client"
import { useResumeStore } from '@/lib/store'
import { useState } from 'react'

export default function BasicDetailsForm() {
  const basics = useResumeStore((s) => s.basics)
  const setBasics = useResumeStore((s) => s.setBasics)
  const [emailError, setEmailError] = useState('')

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  const handleEmailChange = (value: string) => {
    const sanitized = value.replace(/£/g, '@').replace(/\s+/g, '')
    setBasics({ email: sanitized })
    if (!sanitized) {
      setEmailError('')
    } else {
      setEmailError(emailRegex.test(sanitized) ? '' : 'Enter a valid email address')
    }
  }
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <Text id="tour-name" label="Full Name" value={basics.fullName} onChange={(v) => setBasics({ fullName: v })} required />
      <div>
        <label className="block text-sm font-medium">
          Email
          <span className="ml-1 text-red-600">*</span>
        </label>
        <input
          className={`input mt-1 ${emailError ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
          value={basics.email}
          onChange={(e) => handleEmailChange(e.target.value)}
          type="email"
          required
          inputMode="email"
        />
        {emailError && <p className="mt-1 text-xs text-red-600">{emailError}</p>}
      </div>
      <Text label="Phone" value={basics.phone || ''} onChange={(v) => setBasics({ phone: v })} />
      <Text label="Location" value={basics.location || ''} onChange={(v) => setBasics({ location: v })} />
      <Text label="Headline" value={basics.headline || ''} onChange={(v) => setBasics({ headline: v })} />
      <Text label="LinkedIn" value={basics.linkedin || ''} onChange={(v) => setBasics({ linkedin: v })} />
      <Text label="GitHub" value={basics.github || ''} onChange={(v) => setBasics({ github: v })} />
      <Text label="Portfolio" value={basics.portfolio || ''} onChange={(v) => setBasics({ portfolio: v })} />
      <div className="md:col-span-2">
        <Textarea
          label="Professional Summary"
          value={basics.summary || ''}
          placeholder="A concise 2–3 sentence overview. Imported summaries from your resume appear here."
          onChange={(v) => setBasics({ summary: v })}
        />
      </div>
      <div className="md:col-span-2">
        <label className="block text-sm font-medium">Work Authorization</label>
        <select
          className="input mt-1"
          value={basics.workAuth?.status || ''}
          onChange={(e) => {
            const status = e.target.value as any
            if (!status) return setBasics({ workAuth: undefined })
            if (status === 'Work Visa') setBasics({ workAuth: { status, visaType: '' } as any })
            else setBasics({ workAuth: { status } as any })
          }}
        >
          <option value="">Select</option>
          <option>Citizen</option>
          <option>Permanent Resident</option>
          <option>Work Visa</option>
          <option>Not Applicable</option>
        </select>
      </div>
      {basics.workAuth?.status === 'Work Visa' && (
        <>
          <Text label="Visa Type" value={(basics.workAuth as any).visaType || ''} onChange={(v) => setBasics({ workAuth: { ...(basics.workAuth as any), visaType: v } })} />
          <Text label="Expiry (optional)" value={(basics.workAuth as any).expiry || ''} onChange={(v) => setBasics({ workAuth: { ...(basics.workAuth as any), expiry: v } })} />
        </>
      )}
    </div>
  )
}

function Text({ id, label, value, onChange, required }: { id?: string; label: string; value: string; onChange: (v: string) => void; required?: boolean }) {
  return (
    <div>
      <label className="block text-sm font-medium">
        {label}
        {required && <span className="ml-1 text-red-600">*</span>}
      </label>
      <input
        id={id}
        className="input mt-1"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}

function Textarea({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="block text-sm font-medium">{label}</label>
      <textarea
        className="input mt-1 h-32 resize-y"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}
