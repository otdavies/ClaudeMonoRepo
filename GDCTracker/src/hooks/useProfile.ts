import { useLocalStorage } from './useLocalStorage'

export interface UserProfile {
  id: string
  name: string
  color: string
}

export const PROFILE_COLORS = [
  { name: 'Red', hex: '#EF4444' },
  { name: 'Orange', hex: '#F97316' },
  { name: 'Yellow', hex: '#EAB308' },
  { name: 'Green', hex: '#22C55E' },
  { name: 'Teal', hex: '#14B8A6' },
  { name: 'Blue', hex: '#3B82F6' },
  { name: 'Indigo', hex: '#6366F1' },
  { name: 'Purple', hex: '#8B5CF6' },
  { name: 'Pink', hex: '#EC4899' },
  { name: 'Rose', hex: '#F43F5E' },
]

function generateId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}

export function useProfile() {
  const [profile, setProfile] = useLocalStorage<UserProfile | null>('gdc2026-profile', null)

  const saveProfile = (name: string, color: string) => {
    setProfile({
      id: profile?.id ?? generateId(),
      name: name.trim(),
      color,
    })
  }

  return { profile, saveProfile }
}
