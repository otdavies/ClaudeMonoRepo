import { useState, useCallback, useRef, useEffect } from 'react'

export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((prev: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key)
      return item ? JSON.parse(item) : initialValue
    } catch {
      return initialValue
    }
  })

  // Throttle localStorage writes to avoid blocking the main thread
  const pendingWrite = useRef<T | null>(null)
  const writeTimer = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    return () => {
      // Flush pending write on unmount
      if (writeTimer.current) clearTimeout(writeTimer.current)
      if (pendingWrite.current !== null) {
        try { window.localStorage.setItem(key, JSON.stringify(pendingWrite.current)) } catch {}
      }
    }
  }, [key])

  const setValue = useCallback((value: T | ((prev: T) => T)) => {
    setStoredValue(prev => {
      const next = value instanceof Function ? value(prev) : value
      pendingWrite.current = next
      if (writeTimer.current) clearTimeout(writeTimer.current)
      writeTimer.current = setTimeout(() => {
        try {
          window.localStorage.setItem(key, JSON.stringify(pendingWrite.current))
        } catch { /* quota exceeded */ }
        pendingWrite.current = null
      }, 300)
      return next
    })
  }, [key])

  return [storedValue, setValue]
}
