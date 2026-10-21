// Opens real resources on the public test pod in the no-build shell and checks
// that the right pane renders without uncaught errors. No login needed.
//
//   python3 -m http.server 8731 &   # in this directory
//   node tests/shell.mjs [name…]

import { fileURLToPath } from 'node:url'
import { launch } from '../tools/cdp.mjs'

const SHELL = process.env.SHELL_URL ?? 'http://localhost:8731/mashlib/databrowser.html'
const T = 'https://testingsolidos.solidcommunity.net'
const SHOTS = fileURLToPath(new URL('../.shots/', import.meta.url))
const only = process.argv.slice(2)

// name: [subject, text the pane should show]
const SUBJECTS = {
  profile: [`${T}/profile/card#me`, 'Testing SolidOS Test'],
  folder: [`${T}/public/`, 'Testing Tracker'],
  document: [`${T}/profile/card`, 'Personal Profile Document'],
  tracker: [`${T}/public/Testing%20Tracker/index.ttl#this`, null],
  addressBook: [`${T}/public/Contacts/index.ttl#this`, null],
}

// Errors that upstream's published builds log too on the same data (checked with
// PUBLISHED=issue-pane,contacts-pane, i.e. ?published=…): the test pod's data, not us.
const KNOWN = [
  /container representation|preferences|Session restore|Failed to load resource/, // not logged in / not a pod root
  /has no disjointUnionOf|missing its allowed state list/, // Testing Tracker's config lacks wf:Task states
  /Contacts\/groups\.ttl/, // the address book's groups.ttl is private (401)
]

let failures = 0
const check = (name, ok, detail = '') => {
  if (!ok) failures++
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` (${detail})` : ''}`)
}

const ALL_TEXT = `(() => {
  let text = document.body.innerText
  const walk = (node) => { for (const el of node.querySelectorAll('*')) if (el.shadowRoot) { text += '\\n' + el.shadowRoot.textContent; walk(el.shadowRoot) } }
  walk(document)
  return text
})()`

const page = await launch()

try {
  for (const [name, [subject, expect]] of Object.entries(SUBJECTS)) {
    if (only.length && !only.includes(name)) continue

    const before = page.console.length

    await page.goto(`${SHELL}?uri=${encodeURIComponent(subject)}${process.env.PUBLISHED ? `&published=${process.env.PUBLISHED}` : ''}`)

    try {
      // Rendered: the outline has a pane body with real content.
      await page.waitFor(`(() => { const o = document.getElementById('OutlineView'); return !!o && o.innerText.trim().length > 40 })()`, { timeout: 40000 })
      await new Promise(resolve => setTimeout(resolve, 2500)) // let async panes finish

      const text = await page.evaluate(ALL_TEXT)
      const pane = await page.evaluate(() => [...document.querySelectorAll('[data-pane-name], .paneShown, .profile-pane-host')].map(e => e.dataset?.paneName || e.className).slice(0, 3).join(','))
      const errors = page.console.slice(before).filter(l => l.startsWith('exception') || l.startsWith('error'))
        .filter(l => !KNOWN.some(re => re.test(l)))

      await page.screenshot(`${SHOTS}shell-${name}.png`)
      check(`${name}: renders${expect ? ` "${expect}"` : ''}`, expect ? text.includes(expect) : true, pane || undefined)
      check(`${name}: no uncaught errors`, errors.length === 0, errors.slice(0, 2).join(' | ').slice(0, 300))
    } catch (error) {
      check(`${name}: ${error.message}`, false)
      await page.screenshot(`${SHOTS}shell-${name}.png`).catch(() => {})
      console.log(page.console.slice(before).slice(-8).join('\n'))
    }
  }
} finally {
  await page.close()
}

console.log(failures ? `${failures} failed` : 'all passed')
process.exitCode = failures ? 1 : 0
