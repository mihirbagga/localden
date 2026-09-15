import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

const ThemeContext = createContext(null)
export const THEME_KEY = 'ld-theme'

export function readStoredTheme() {
  try {
    const stored = localStorage.getItem(THEME_KEY)
    if (stored === 'light' || stored === 'dark') return stored
  } catch { /* ignore */ }
  if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: light)').matches) {
    return 'light'
  }
  return 'dark'
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => (
    typeof document !== 'undefined'
      ? (document.documentElement.getAttribute('data-theme') || readStoredTheme())
      : 'dark'
  ))

  const apply = useCallback((next) => {
    document.documentElement.setAttribute('data-theme', next)
    try { localStorage.setItem(THEME_KEY, next) } catch { /* ignore */ }
    setThemeState(next)
  }, [])

  useEffect(() => {
    apply(theme === 'light' ? 'light' : 'dark')
  }, [theme, apply])

  const toggle = useCallback(() => {
    apply(theme === 'light' ? 'dark' : 'light')
  }, [apply, theme])

  const value = useMemo(() => ({ theme, setTheme: apply, toggle }), [theme, apply, toggle])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>')
  return ctx
}
