// Load a .css file as a constructable stylesheet, so components keep their
// styles in plain CSS files. Lit accepts CSSStyleSheet in `static styles`.
// Note: constructable sheets ignore @import, so inline anything imported.

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
