// Every check in one run.
//
//   python3 -m http.server 8731 &      # in this directory
//   node tests/run-all.mjs              # page checks + shell (public test pod)
//   node tests/run-all.mjs --pod        # … + login/edit/create on the local JSS pod
//
// Page checks are the in-page smoke tests (they write PASS/FAIL into a <pre>);
// "load" checks import every module of a package on its own.

import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { launch } from '../tools/cdp.mjs'

const BASE = process.env.BASE ?? 'http://localhost:8731/'
const here = fileURLToPath(new URL('.', import.meta.url))

const PAGES = [
  ['components (gallery)', 'index.html?smoke', '#smoke'],
  ['components (tags)', 'index.html?tags', '#tags'],
  ['login', 'login.html?smoke', '#smoke'],
  ['legacy library', 'legacy.html?load', '#smoke'],
  ['legacy modules', 'legacy.html?load', '#load'],
  ['profile-pane sandbox', 'pane.html?pane=profile-pane&smoke', '#smoke'],
  ...['src', 'panes/profile-pane/src', 'panes/solid-panes/src', 'panes/folder-pane/src', 'panes/source-pane/src',
    'panes/chat-pane/src', 'panes/contacts-pane/src', 'panes/issue-pane/src', 'panes/meeting-pane/src', 'mashlib/src']
    .map(dir => [`load ${dir}`, `demo/load-each.html?dir=${dir}`, '#out']),
]

// Modules that fail on their own upstream too (dead code, not loaded by anything).
const EXPECTED_LOAD_FAILURES = [/argument\/argumentPane\.js/]

let failures = 0
let passes = 0

const page = await launch({ port: 9334 })

try {
  for (const [name, path, selector] of PAGES) {
    await page.goto(BASE + path)

    try {
      const text = await page.waitFor(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); return el && /DONE|defined \\d/.test(el.textContent) && el.textContent })()`, { timeout: 90000 })
      const lines = text.split('\n').filter(Boolean)
      const failed = lines.filter(l => /^FAIL/.test(l) && !EXPECTED_LOAD_FAILURES.some(re => re.test(l)))
      const loaded = text.match(/loaded (\d+)\/(\d+)/)
      const defined = text.match(/defined (\d+)\/(\d+)/)
      const count = lines.filter(l => /^PASS/.test(l)).length
      const ok = failed.length === 0 && (!defined || defined[1] === defined[2])
      const summary = loaded ? `${loaded[0]}${failed.length ? '' : lines.some(l => /^FAIL/.test(l)) ? ' (expected upstream failures only)' : ''}`
        : defined ? defined[0] : `${count} checks`

      ok ? passes++ : failures++
      console.log(`${ok ? 'PASS' : 'FAIL'} ${name}: ${summary}`)
      for (const line of failed) console.log(`     ${line}`)
    } catch (error) {
      failures++
      console.log(`FAIL ${name}: ${error.message.slice(0, 200)}`)
    }
  }
} finally {
  await page.close()
}

for (const suite of ['shell.mjs', ...(process.argv.includes('--pod') ? ['pod.mjs'] : [])]) {
  console.log(`\n== tests/${suite}`)
  const run = spawnSync(process.execPath, [`${here}${suite}`], { encoding: 'utf8', timeout: 600000 })
  const lines = run.stdout.split('\n').filter(l => /^(PASS|FAIL|KNOWN)|^ +→/.test(l))

  for (const line of lines) console.log(line)
  run.status === 0 ? passes++ : failures++
}

console.log(`\n${failures ? `${failures} FAILED` : 'ALL PASSED'} (${passes} suites/pages passed)`)
process.exitCode = failures ? 1 : 0
