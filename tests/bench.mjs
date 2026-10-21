// Load time: no-build SolidOS vs upstream's bundled mashlib 3.0.0, on two JSS pods
// with the same layout, logged out, both through --mashlib-module and both served
// from local disk:
//
//   :8732  --mashlib-module …/me/public/solidos/mashlib/boot.js   (this tree)
//   :8733  --mashlib-module …/upstream-boot.js                    (dist/mashlib.min.js etc.)
//
//   node tests/bench.mjs [runs]
//
// ready  = ms from navigation start until the pane has rendered (polled every 25 ms)
// cold   = fresh browser profile, cache disabled; warm = reload with the cache
// slow   = the same with DevTools network throttling: 40 ms latency, 20 Mbit/s down
// Requests and bytes come from DevTools network events (all hosts, encoded size).
// Third-party CDN files (jsdelivr/esm.sh) are included in both.

import { mkdtempSync, rmSync } from 'node:fs'
import { launch } from '../tools/cdp.mjs'

const RUNS = Number(process.argv[2] ?? 3)
const VARIANTS = { 'no-build': 'http://127.0.0.1:8732', upstream: 'http://127.0.0.1:8733' }
const PAGES = {
  profile: ['/me/profile/card.jsonld#me', `!!document.querySelector('.profile-pane-host') && /\\bme\\b/.test(document.querySelector('.profile-pane-host').innerText)`],
  folder: ['/me/', `/settings/.test(document.getElementById('OutlineView')?.innerText ?? '')`],
}
const NETWORKS = {
  fast: null,
  slow: { offline: false, latency: 40, downloadThroughput: 20e6 / 8, uploadThroughput: 5e6 / 8 },
}

const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)]

async function measure (page, load, ready) {
  const requests = new Map()
  const off = page.on(({ method, params }) => {
    if (method === 'Network.requestWillBeSent') requests.set(params.requestId, { url: params.request.url, type: params.type, bytes: 0 })
    if (method === 'Network.loadingFinished' && requests.has(params.requestId)) requests.get(params.requestId).bytes = params.encodedDataLength
  })

  await load()

  const ready_ = await page.waitFor(`(${ready}) && performance.now()`, { timeout: 90000, interval: 25 })

  await new Promise(resolve => setTimeout(resolve, 1500)) // late requests
  off()

  const all = [...requests.values()]
  const js = all.filter(r => r.type === 'Script')
  const sum = (list) => list.reduce((a, r) => a + r.bytes, 0)

  return { ready: Math.round(ready_), requests: all.length, bytes: sum(all), jsRequests: js.length, jsBytes: sum(js) }
}

const results = []

for (const [network, conditions] of Object.entries(NETWORKS)) {
  for (const [variant, origin] of Object.entries(VARIANTS)) {
    for (const [name, [path, ready]] of Object.entries(PAGES)) {
      const cold = []
      const warm = []

      for (let i = 0; i < RUNS; i++) {
        const profile = mkdtempSync(new URL('../.chrome-bench-', import.meta.url).pathname) // snap Chromium can't use hidden dirs like ~/.cache
        const page = await launch({ profile })

        try {
          await page.send('Network.enable')
          if (conditions) await page.send('Network.emulateNetworkConditions', conditions)
          await page.send('Network.setCacheDisabled', { cacheDisabled: true })
          cold.push(await measure(page, () => page.goto(origin + path, { waitLoad: false }), ready))
          await page.send('Network.setCacheDisabled', { cacheDisabled: false })
          await measure(page, () => page.reload(), ready) // fill the cache
          warm.push(await measure(page, () => page.reload(), ready))
        } finally {
          await page.close()
          rmSync(profile, { recursive: true, force: true })
        }
      }

      for (const [mode, runs] of [['cold', cold], ['warm', warm]]) {
        results.push({
          network, variant, page: name, mode,
          ready: median(runs.map(r => r.ready)),
          runs: runs.map(r => r.ready).join('/'),
          requests: median(runs.map(r => r.requests)),
          KB: Math.round(median(runs.map(r => r.bytes)) / 1024),
          'JS req': median(runs.map(r => r.jsRequests)),
          'JS KB': Math.round(median(runs.map(r => r.jsBytes)) / 1024),
        })
      }
    }
  }
}

console.table(results)
console.log('JSON ' + JSON.stringify(results))
