"use client"
import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth'
import Modal from '@/components/ui/Modal'
import { useResumeStore, snapshot } from '@/lib/store'
import { loadResume, saveResume, hasResume } from '@/lib/persistence'

export default function AuthButton() {
  const { user, signIn, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const setBasics = useResumeStore((s) => s.setBasics)
  const seedExample = useResumeStore((s) => s.seedExample)
  const setAllFromSnapshot = (data: ReturnType<typeof snapshot>) => {
    useResumeStore.setState({
      basics: data.basics,
      experience: data.experience,
      projects: data.projects,
      attachments: data.attachments,
      instructions: data.instructions,
      template: data.template,
    })
  }

  // Persist resume data on changes when logged in
  useEffect(() => {
    setMounted(true)
    if (!user) return
    const unsub = useResumeStore.subscribe(() => {
      try { saveResume(user.id, snapshot()) } catch {}
    })
    return () => unsub()
  }, [user])

  function handleSignIn(name: string, email: string) {
    const id = email.toLowerCase().trim()
    signIn({ id, name: name.trim(), email: id })
    const existing = loadResume(id)
    if (existing) setAllFromSnapshot(existing)
    else {
      // First time user: seed a demo
      seedExample()
      setBasics({ fullName: name, email })
    }
  }

  return (
    <>
      <Modal open={open} title="Sign in" onClose={() => setOpen(false)}>
        <SignInForm onSubmit={(n, e) => { handleSignIn(n, e); setOpen(false) }} />
      </Modal>
      {!mounted ? null : user ? (
        <div className="segmented" title={user.email}>
          <span className="px-3 py-1.5 text-sm">Hi, {user.name.split(' ')[0] || 'User'}</span>
          <button onClick={() => signOut()}>Sign out</button>
        </div>
      ) : (
        <button className="btn" onClick={() => setOpen(true)}>Sign in</button>
      )}
    </>
  )
}

function SignInForm({ onSubmit }: { onSubmit: (name: string, email: string) => void }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  return (
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
  )
}
