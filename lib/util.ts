export const nanoid = (size = 8) =>
  Array.from(crypto.getRandomValues(new Uint8Array(size)))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')

export const unique = <T>(arr: T[]) => Array.from(new Set(arr))

export const tokenize = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)

