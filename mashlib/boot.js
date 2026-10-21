// Entry point for a Solid server's ES-module data browser mode, e.g. JSS:
//
//   jss start --mashlib-module https://<pod>/public/solidos/mashlib/boot.js
//
// The server serves, for every resource a browser navigates to, a bare page with
// <div id="mashlib"> and this module. So this does what mashlib's databrowser.html
// does: the importmap, the page markup, mashlib, then runDataBrowser() for the
// page's own URL. (Also fetches boot.css: <moduleUrl>.css; mash.css comes via
// mashlib's own importCss.)

const here = (path) => new URL(path, import.meta.url).href

// 1. The importmap: src/importmap.js is a classic script that writes it next to
//    itself. Import maps added before the first bare import still apply.
await new Promise((resolve, reject) => {
  const script = document.createElement('script')

  script.src = here('../src/importmap.js')
  script.onload = resolve
  script.onerror = () => reject(new Error(`could not load ${script.src}`))
  document.head.append(script)
})

// 2. The markup of mashlib's src/databrowser.html, into the server's page.
document.body.id = 'PageBody'
document.body.dataset.appShell = 'databrowser'
document.getElementById('mashlib')?.remove()
document.body.insertAdjacentHTML('beforeend', `
  <solid-ui-provider>
    <a href="#MainContent" class="skip-link">Skip to main content</a>
    <div class="app-main" tabindex="-1" aria-live="polite">
      <div class="app-shell">
        <main id="MainContent" class="app-view">
          <table id="OutlineView" class="outline-view" aria-label="Resource browser"></table>
        </main>
      </div>
    </div>
  </solid-ui-provider>
`)

// 3. mashlib, then the data browser for this page's URL.
await import('./src/index.js')

window.panes.runDataBrowser()

// 4. As databrowser.html: keep --app-header-height in step with the header.
const header = document.getElementById('mainSolidUiHeader')

if (header) {
  const syncHeaderHeight = () => {
    const height = header.getBoundingClientRect().height

    if (height > 0) {
      const rootFontSize = parseFloat(getComputedStyle(document.documentElement).fontSize)

      document.documentElement.style.setProperty('--app-header-height', (height / rootFontSize) + 'rem')
    }
  }

  syncHeaderHeight()
  new ResizeObserver(syncHeaderHeight).observe(header)
}
