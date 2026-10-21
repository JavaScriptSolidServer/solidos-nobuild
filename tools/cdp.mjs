// A small Chrome DevTools Protocol driver for the tests that need a real session
// (login, editing). No npm dependencies: headless Chromium + Node's WebSocket.
//
//   import { launch } from './cdp.mjs'
//   const page = await launch({ profile: '/path/to/profile-dir' })
//   await page.goto('http://127.0.0.1:8732/me/profile/card.jsonld#me')
//   await page.waitFor(() => document.querySelector('solid-ui-account'))
//   await page.close()
//
// Functions passed to evaluate/waitFor run in the page (they are stringified),
// so they can't close over Node variables; pass those as `args`.

import { spawn } from 'node:child_process'
import { writeFileSync, mkdirSync } from 'node:fs'

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

export async function launch ({ profile, port = 9333, width = 1300, height = 900, browser = 'chromium-browser' } = {}) {
  if (profile) mkdirSync(profile, { recursive: true })

  const proc = spawn(browser, [
    '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    `--remote-debugging-port=${port}`, `--window-size=${width},${height}`,
    ...(profile ? [`--user-data-dir=${profile}`] : []),
    'about:blank',
  ], { stdio: ['ignore', 'ignore', 'pipe'] })

  let stderr = ''

  proc.stderr.on('data', d => { stderr += d })

  // Wait for the DevTools endpoint and the first page target.
  let target

  for (let i = 0; i < 100 && !target; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()

      target = list.find(t => t.type === 'page')
    } catch {}
    if (!target) await sleep(100)
  }

  if (!target) {
    proc.kill()
    throw new Error(`no DevTools target on :${port}\n${stderr.slice(-500)}`)
  }

  const ws = new WebSocket(target.webSocketDebuggerUrl)
  const pending = new Map()
  const listeners = new Set()
  let nextId = 1

  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject })

  ws.onmessage = (event) => {
    const message = JSON.parse(event.data)

    if (message.id && pending.has(message.id)) {
      const { resolve, reject } = pending.get(message.id)

      pending.delete(message.id)
      message.error ? reject(new Error(message.error.message)) : resolve(message.result)
    } else if (message.method) {
      for (const listener of listeners) listener(message)
    }
  }

  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = nextId++

    pending.set(id, { resolve, reject })
    ws.send(JSON.stringify({ id, method, params }))
  })

  const consoleLines = []

  listeners.add(({ method, params }) => {
    if (method === 'Runtime.consoleAPICalled') consoleLines.push(`${params.type}: ${params.args.map(a => a.value ?? a.description ?? '').join(' ')}`)
    if (method === 'Runtime.exceptionThrown') consoleLines.push(`exception: ${params.exceptionDetails.exception?.description ?? params.exceptionDetails.text}`)
    // alert/confirm/prompt would block the page (and every evaluate): log and dismiss.
    if (method === 'Page.javascriptDialogOpening') {
      consoleLines.push(`dialog: ${params.type}: ${params.message}`)
      send('Page.handleJavaScriptDialog', { accept: params.type !== 'beforeunload' }).catch(() => {})
    }
  })

  await send('Page.enable')
  await send('Runtime.enable')
  // A headless tab never has focus, so focus/blur events wouldn't fire; emulate it.
  await send('Emulation.setFocusEmulationEnabled', { enabled: true })

  const evaluate = async (fn, ...args) => {
    const expression = typeof fn === 'function' ? `(${fn})(...${JSON.stringify(args)})` : fn
    const { result, exceptionDetails } = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })

    if (exceptionDetails) throw new Error(exceptionDetails.exception?.description ?? exceptionDetails.text)

    return result.value
  }

  const page = {
    console: consoleLines,
    send,
    evaluate,

    async goto (url, { waitLoad = true } = {}) {
      const loaded = waitLoad ? new Promise(resolve => {
        const listener = ({ method }) => { if (method === 'Page.loadEventFired') { listeners.delete(listener); resolve() } }

        listeners.add(listener)
      }) : null

      await send('Page.navigate', { url })
      if (loaded) await Promise.race([loaded, sleep(30000)])
    },

    // Poll fn in the page until it returns something truthy; returns that value.
    async waitFor (fn, { timeout = 20000, interval = 200, args = [] } = {}) {
      const end = Date.now() + timeout
      let last

      while (Date.now() < end) {
        try {
          last = await evaluate(fn, ...args)
          if (last) return last
        } catch (error) {
          last = error.message // navigation in progress, etc.
        }
        await sleep(interval)
      }

      throw new Error(`waitFor timed out: ${String(fn).slice(0, 120)} (last: ${String(last).slice(0, 200)})`)
    },

    async url () {
      return evaluate(() => location.href)
    },

    async screenshot (path) {
      const { data } = await send('Page.captureScreenshot', { format: 'png' })

      writeFileSync(path, Buffer.from(data, 'base64'))
    },

    // Real keystrokes into the focused element (fires input events like a user).
    async type (text) {
      await send('Input.insertText', { text })
    },

    async close () {
      try { ws.close() } catch {}
      proc.kill()
      await sleep(200)
    },
  }

  return page
}
