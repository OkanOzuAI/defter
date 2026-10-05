export type Theme = 'dark' | 'light'

const STORAGE_KEY = 'defter.theme'
const THEME_COLOR: Record<Theme, string> = { dark: '#0b0c0e', light: '#f6f6f4' }

export function getTheme(): Theme {
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'
}

export function setTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR[theme])
  try {
    localStorage.setItem(STORAGE_KEY, theme)
  } catch {
    // ignore: the theme still applies for this page load
  }
}
