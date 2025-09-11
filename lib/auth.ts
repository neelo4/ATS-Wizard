import { create } from 'zustand'

export type User = { id: string; name: string; email: string }

type AuthState = {
  user: User | null
  signIn: (user: User) => void
  signOut: () => void
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  signIn: (user) => set({ user }),
  signOut: () => set({ user: null }),
}))

