"use client"
import { useEffect, useState } from 'react'
import Modal from '@/components/ui/Modal'
import { useAuth } from '@/lib/auth'
import { useResumeStore, snapshot } from '@/lib/store'
import { loadResume, saveResume } from '@/lib/persistence'

export default function AuthGate() {
  const { user, signIn } = useAuth()
  const [open, setOpen] = useState(false)
  const setBasics = useResumeStore((s) => s.setBasics)
  const seedExample = useResumeStore((s) => s.seedExample)

  useEffect(() => {
    if (!user) setOpen(true)
    else setOpen(false)
  }, [user])

  // Auto-persist when signed in
  useEffect(() => {
    if (!user) return
    const unsub = useResumeStore.subscribe(() => {
      try { saveResume(user.id, snapshot()) } catch {}
    })
    return () => unsub()
  }, [user])

  return (
    <SignInModal
      open={open}
      onSubmit={(name, email) => {
        const id = email.trim().toLowerCase()
        signIn({ id, name: name.trim() || 'User', email: id })
        const existing = loadResume(id)
        if (existing) {
          // hydrate store
          useResumeStore.setState({
            basics: existing.basics,
            experience: existing.experience,
            projects: existing.projects,
            attachments: existing.attachments,
            instructions: existing.instructions,
            template: existing.template,
          })
        } else {
          seedExample()
          setBasics({ fullName: name, email })
        }
      }}
      overlayClassName="bg-black/40 backdrop-blur"
    />
  )
}

function SignInModal({ open, onSubmit, overlayClassName }: { open: boolean; onSubmit: (name: string, email: string) => void; overlayClassName?: string }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  return (
    <Modal open={open} title="Welcome — Sign in to continue" onClose={() => {}} overlayClassName={overlayClassName}>
      <form
        className="space-y-3"
        onSubmit={(e) => { e.preventDefault(); if (email.trim()) onSubmit(name, email) }}
      >
        <div>
          <label className="block text-sm font-medium">Name</label>
          <input className="input mt-1" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium">Email</label>
          <input className="input mt-1" value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="submit" className="btn btn-primary">Continue</button>
        </div>
        
      </form>
    </Modal>
  )
}
