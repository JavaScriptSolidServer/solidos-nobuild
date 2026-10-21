

const THEME_STORAGE_KEY = 'mashlib-theme'

const applyTheme = (theme) => {
  if (theme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark')
  } else {
    document.documentElement.removeAttribute('data-theme')
  }

  window.dispatchEvent(new CustomEvent('mashlib:themechange', {
    detail: { theme }
  }))
}

const initializeTheme = () => {
  const savedTheme = localStorage.getItem(THEME_STORAGE_KEY)
  const prefersDark = typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-color-scheme: dark)').matches
    : false
  const theme = (
    savedTheme === 'dark' || savedTheme === 'light'
      ? savedTheme
      : prefersDark
        ? 'dark'
        : 'light'
  )

  applyTheme(theme)
}

const setTheme = (theme) => {
  applyTheme(theme)
  localStorage.setItem(THEME_STORAGE_KEY, theme)
}

const getTheme = () => {
  return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'
}

export const theme = {
  get: getTheme,
  init: initializeTheme,
  set: setTheme
}
