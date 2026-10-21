// Stands in for Vite's CSS injection: a plain `import './x.css'` becomes
// importCss(new URL('./x.css', import.meta.url)), a <link> in <head>, once per file.

const added = new Set()

export function importCss (url) {
  const href = String(url)

  if (added.has(href) || typeof document === 'undefined') return

  added.add(href)

  const link = document.createElement('link')

  link.rel = 'stylesheet'
  link.href = href
  document.head.append(link)
}
