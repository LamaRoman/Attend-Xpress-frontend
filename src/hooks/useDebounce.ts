import { useState, useEffect } from 'react'

/**
 * Returns a debounced copy of `value` that only updates after
 * `delayMs` milliseconds of no changes. Use this to avoid firing
 * expensive operations (API calls, etc.) on every keystroke.
 *
 * @example
 * const debouncedSearch = useDebounce(searchTerm, 400)
 * useEffect(() => { fetchResults(debouncedSearch) }, [debouncedSearch])
 */
export function useDebounce<T>(value: T, delayMs = 400): T {
  const [debounced, setDebounced] = useState<T>(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(timer)
  }, [value, delayMs])

  return debounced
}
