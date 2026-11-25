import { useEffect, useRef, useState } from 'react'

/**
 * useState that remembers its value in localStorage, for per-browser
 * conveniences. The stored value is read after mount, so server and client
 * render the same first frame; storage that is unavailable or full is ignored.
 */
export function useStoredState<T>(
  key: string,
  initial: T,
  accept: (value: unknown) => value is T = (value): value is T => value !== undefined
) {
  const [value, setValue] = useState<T>(initial)
  const loaded = useRef(false)

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key)
      if (raw !== null) {
        const parsed = JSON.parse(raw) as unknown
        if (accept(parsed)) setValue(parsed)
      }
    } catch {
      // Private mode, blocked storage or a malformed value: keep the default.
    }
    loaded.current = true
    // Read once per key.
  }, [key])

  useEffect(() => {
    if (!loaded.current) return
    try {
      window.localStorage.setItem(key, JSON.stringify(value))
    } catch {
      // Not worth surfacing.
    }
  }, [key, value])

  return [value, setValue] as const
}
