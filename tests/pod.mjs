// End-to-end tests against a local JSS pod serving this tree as its data browser.
//
//   node tests/pod.mjs            # needs JSS on 127.0.0.1:8732 (see README, "Running on a pod")
//
// Logs in through the real IdP, then exercises what needs a session. The browser
// profile lives in .chrome-profile/ so the session can be reused between steps.

import { readFileSync, rmSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { launch } from '../tools/cdp.mjs'

const POD = process.env.POD ?? 'http://127.0.0.1:8732/me/'
const WEBID = `${POD}profile/card.jsonld#me`
const PASSWORD = process.env.POD_PASSWORD ?? readFileSync(new URL('../../jss-password.txt', import.meta.url), 'utf8').trim()
const PROFILE_DIR = fileURLToPath(new URL('../.chrome-profile/', import.meta.url))
const SHOTS = fileURLToPath(new URL('../.shots/', import.meta.url))
const only = process.argv.slice(2)

let failures = 0
const check = (name, ok, detail = '') => {
  if (!ok) failures++
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` (${detail})` : ''}`)
}

// Search through open shadow roots: deep('solid-ui-account') etc.
const DEEP = `(sel, root = document) => {
  const walk = (node) => {
    const found = node.querySelector(sel)
    if (found) return found
    for (const el of node.querySelectorAll('*')) if (el.shadowRoot) { const f = walk(el.shadowRoot); if (f) return f }
    return null
  }
  return walk(root)
}`

const tests = {}

tests.login = async (page) => {
  await page.goto(WEBID)
  await page.waitFor(`!!(${DEEP})('solid-ui-account')?.shadowRoot?.querySelector('solid-ui-login-button')`, { timeout: 30000 })
  check('pod serves SolidOS; header shows Log In', true)

  await page.evaluate(`(${DEEP})('solid-ui-account').shadowRoot.querySelector('solid-ui-login-button solid-ui-button').shadowRoot.querySelector('button').click()`)
  const issuer = await page.waitFor(`(() => { const m = (${DEEP})('solid-ui-login-modal'); return m && m.issuerInputValue })()`)
  check(`login modal opens, issuer ${issuer}`, issuer === new URL(POD).origin)

  await page.evaluate(`(() => { const m = (${DEEP})('solid-ui-login-modal'); const b = [...m.shadowRoot.querySelectorAll('solid-ui-dialog-footer solid-ui-button')][1]; b.shadowRoot.querySelector('button').click() })()`)
  await page.waitFor(() => location.pathname.startsWith('/idp/') && !!document.querySelector('#username'), { timeout: 30000 })
  check('redirects to the JSS IdP login page', true)

  await page.evaluate((password) => {
    document.querySelector('#username').value = 'me'
    document.querySelector('#password').value = password
    document.querySelector('form[action$="/login"]').submit()
  }, PASSWORD)

  // JSS may offer a passkey and/or a consent page before returning to the pod.
  for (let step = 0; step < 4; step++) {
    const where = await page.waitFor(() => {
      if (!location.pathname.startsWith('/idp/')) return 'back'
      const skip = [...document.querySelectorAll('button, a')].find(b => /skip for now/i.test(b.textContent))
      if (skip) return 'passkey'
      if (document.querySelector('form[action$="/confirm"]')) return 'consent'
      return false
    }, { timeout: 30000 })

    if (where === 'back') break
    if (where === 'passkey') {
      check('IdP offers a passkey; skipping', true)
      await page.evaluate(() => [...document.querySelectorAll('button, a')].find(b => /skip for now/i.test(b.textContent)).click())
    }
    if (where === 'consent') {
      check('IdP consent page; allowing', true)
      await page.evaluate(() => document.querySelector('form[action$="/confirm"]').submit())
    }
    await new Promise(resolve => setTimeout(resolve, 1000))
  }

  await page.waitFor(`!!(${DEEP})('solid-ui-account')?.hasAttribute('data-state-loggedin')`, { timeout: 40000 })
  check('back on the pod, logged in', true, await page.url())
  await page.screenshot(`${SHOTS}pod-logged-in.png`)
}

// Click a button by its visible text (solid-ui-button or native), searching shadow roots.
const CLICK_TEXT = `(text) => {
  const all = []
  const walk = (node) => { for (const el of node.querySelectorAll('*')) { all.push(el); if (el.shadowRoot) walk(el.shadowRoot) } }
  walk(document)
  const hit = all.find(el => (el.matches('button, solid-ui-button, a, [role=button]')) && el.textContent.trim() === text)
    ?? all.find(el => el.matches('button, solid-ui-button') && el.textContent.trim().includes(text))
  if (!hit) return false
  const target = hit.matches('solid-ui-button') ? hit.shadowRoot.querySelector('button') : hit
  target.click()
  return true
}`

const DATA = fileURLToPath(new URL('../../jss-data/me/', import.meta.url))

tests.editBio = async (page) => {
  const bio = `Written by the no-build SolidOS test at ${new Date().toISOString()}`

  await page.goto(WEBID)
  await page.waitFor(`!!(${DEEP})('solid-ui-account')?.hasAttribute('data-state-loggedin')`, { timeout: 30000 })
  await page.waitFor(`(${CLICK_TEXT})('Add Bio') || (${CLICK_TEXT})('Edit Bio')`, { timeout: 30000 })
  await page.waitFor(`!!(${DEEP})('.profile-edit-dialog__textarea')`)
  check('Add Bio opens the bio dialog', true)

  await page.evaluate(`(() => { const t = (${DEEP})('.profile-edit-dialog__textarea'); t.focus(); t.select() })()`)
  await page.type(bio)
  await page.evaluate(`(() => { const b = (${DEEP})('#modal-buttons [data-dialog-primary="true"]'); (b.shadowRoot?.querySelector('button') ?? b).click() })()`)
  await page.waitFor(`!(${DEEP})('dialog[open] .profile-edit-dialog__textarea')`, { timeout: 30000 })
  check('Save closes the dialog', true)

  const onDisk = await (async () => {
    for (let i = 0; i < 20; i++) {
      const text = readFileSync(`${DATA}profile/card.jsonld`, 'utf8')
      if (text.includes(bio)) return true
      await new Promise(resolve => setTimeout(resolve, 250))
    }
    return false
  })()
  check('the bio is written to the pod (profile/card.jsonld on disk)', onDisk)

  await page.goto(WEBID)
  await page.waitFor(`document.body.innerText.includes(${JSON.stringify(bio)}) || [...document.querySelectorAll('*')].some(e => e.shadowRoot && e.shadowRoot.textContent.includes(${JSON.stringify(bio)}))`, { timeout: 30000 })
  check('after reload the profile shows the saved bio', true)
  await page.screenshot(`${SHOTS}pod-bio.png`)
}

// The login test starts from a clean, logged-out browser profile.
if (!only.length || only.includes('login')) rmSync(PROFILE_DIR, { recursive: true, force: true })

const page = await launch({ profile: PROFILE_DIR })

try {
  for (const [name, test] of Object.entries(tests)) {
    if (only.length && !only.includes(name)) continue

    try {
      await test(page)
    } catch (error) {
      check(`${name}: ${error.message}`, false)
      await page.screenshot(`${SHOTS}pod-fail-${name}.png`).catch(() => {})
      console.log(page.console.slice(-15).join('\n'))
    }
  }
} finally {
  await page.close()
}

console.log(failures ? `${failures} failed` : 'all passed')
process.exitCode = failures ? 1 : 0
