// Stands in for vite-plugin-lit-css: `import styles from './x.styles.css'` becomes
// await loadSheet(new URL('./x.styles.css', import.meta.url)), a CSSStyleSheet Lit
// accepts in `static styles`. Constructable sheets ignore @import.

const cache = new Map()

export function loadSheet (url) {
  const key = String(url)

  if (!cache.has(key)) {
    cache.set(key, fetch(key).then(async (response) => {
      if (!response.ok) throw new Error(`loadSheet: ${response.status} ${key}`)

      const sheet = new CSSStyleSheet()

      sheet.replaceSync(await response.text())

      return sheet
    }))
  }

  return cache.get(key)
}
