"use client"
import { useResumeStore } from '@/lib/store'

export default function BasicDetailsForm() {
  const basics = useResumeStore((s) => s.basics)
  const setBasics = useResumeStore((s) => s.setBasics)
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <Text id="tour-name" label="Full Name" value={basics.fullName} onChange={(v) => setBasics({ fullName: v })} required />
      <Text label="Email" value={basics.email} onChange={(v) => setBasics({ email: v })} required />
      <Text label="Phone" value={basics.phone || ''} onChange={(v) => setBasics({ phone: v })} />
      <Text label="Location" value={basics.location || ''} onChange={(v) => setBasics({ location: v })} />
      <Text label="Headline" value={basics.headline || ''} onChange={(v) => setBasics({ headline: v })} />
      <Text label="LinkedIn" value={basics.linkedin || ''} onChange={(v) => setBasics({ linkedin: v })} />
      <Text label="GitHub" value={basics.github || ''} onChange={(v) => setBasics({ github: v })} />
      <Text label="Portfolio" value={basics.portfolio || ''} onChange={(v) => setBasics({ portfolio: v })} />
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
