import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

const ThemeContext = createContext(null)
export const THEME_KEY = 'ld-theme'

// Set FORCE_DARK_MODE = true to force dark mode platform-wide.
// Set FORCE_DARK_MODE = false to re-enable light/dark theme switching.
export const FORCE_DARK_MODE = true

export function readStoredTheme() {
  if (FORCE_DARK_MODE) return 'dark'
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
    FORCE_DARK_MODE ? 'dark' : (typeof document !== 'undefined' ? (document.documentElement.getAttribute('data-theme') || readStoredTheme()) : 'dark')
  ))

  const apply = useCallback((next) => {
    const targetTheme = FORCE_DARK_MODE ? 'dark' : next
    document.documentElement.setAttribute('data-theme', targetTheme)
    try { localStorage.setItem(THEME_KEY, targetTheme) } catch { /* ignore */ }
    setThemeState(targetTheme)
  }, [])

  useEffect(() => {
    apply(FORCE_DARK_MODE ? 'dark' : (theme === 'light' ? 'light' : 'dark'))
  }, [theme, apply])

  const toggle = useCallback(() => {
    if (FORCE_DARK_MODE) return
    apply(theme === 'light' ? 'dark' : 'light')
  }, [apply, theme])

  const value = useMemo(() => ({
    theme: FORCE_DARK_MODE ? 'dark' : theme,
    setTheme: apply,
    toggle,
    isForceDark: FORCE_DARK_MODE,
  }), [theme, apply, toggle])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>')
  return ctx
}
