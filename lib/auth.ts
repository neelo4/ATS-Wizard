import { create } from 'zustand'

export type User = { id: string; name: string; email: string }

type AuthState = {
  user: User | null
  signIn: (user: User) => void
  signOut: () => void
}

export const KEY = 'auth:user'
export const useAuth = create<AuthState>((set) => ({
  user: null,
  signIn: (user) => { try { localStorage.setItem(KEY, JSON.stringify(user)) } catch {} set({ user }) },
  signOut: () => { try { localStorage.removeItem(KEY) } catch {} set({ user: null }) },
}))

export function loadUser(): User | null {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as User) : null
  } catch {
    return null
  }
}
