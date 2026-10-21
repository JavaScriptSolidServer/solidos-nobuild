import { importCss } from './importCss.js'
// IMPORTANT: must be the first import so window.SolidLogic / window.$rdf are
// defined before solid-ui / solid-panes prebuilt bundles are evaluated
// (they declare `solid-logic` and `rdflib` as UMD externals with
// root: "SolidLogic" / "$rdf").
import './globals.js'

import * as $rdf from 'rdflib'
import * as SolidLogic from 'solid-logic'

import * as panes from 'solid-panes'
import { layout } from './layout.js'
import { theme } from './theme.js'
import versionInfo from './versionInfo.js'
importCss(new URL('./styles/mash.css', import.meta.url))
import 'solid-ui/components/provider'

const global = window
global.panes = { ...panes } // a module namespace is sealed; webpack's isn't, and runDataBrowser is added below
global.mashlib = { versionInfo }

layout.init()
theme.init()

// Build a snapshot of the current render environment
const buildRenderEnvironment = () => ({
  layout: layout.get(),
  layoutPreference: layout.getPreference(),
  inputMode: layout.getInputMode(),
  theme: theme.get(),
  viewport: layout.getViewport()
})

// Inject or update the environment on the pane context
const syncEnvironmentToContext = async (_trigger) => {
  const outliner = panes.getOutliner(document)

  if (!outliner) {
    return
  }

  if (!outliner.context) {
    outliner.context = {}
  }

  panes.updateEnvironment(outliner, buildRenderEnvironment())
  await panes.refreshUI(outliner)
}

// Keep environment in sync on layout/theme changes
window.addEventListener('mashlib:layoutchange', syncEnvironmentToContext)
window.addEventListener('mashlib:themechange', syncEnvironmentToContext)

global.panes.runDataBrowser = function (uri) {
  // Set up cross-site proxy
  const fetcher = $rdf.Fetcher
  fetcher.crossSiteProxyTemplate = window.origin + '/xss/?uri={uri}'

  // Add web monetization tag to page header
  try {
    const webMonetizationTag = document.createElement('meta')
    webMonetizationTag.setAttribute('name', 'monetization')
    webMonetizationTag.setAttribute('content', `$${window.location.host}`)
    document.head.appendChild(webMonetizationTag)
  } catch {}

  window.addEventListener('load', syncEnvironmentToContext)

  // Authenticate the user
  SolidLogic.authn.checkUser()
    .then(() => panes.initMainPage(
      SolidLogic.solidLogicSingleton.store,
      uri,
      buildRenderEnvironment()
    ))
    .then(() => {
      // Re-sync in case layout/theme changed between snapshot and outliner init
      syncEnvironmentToContext('initMainPage')
    })
    .catch(() => undefined)

}

window.onpopstate = function (_event) {
  global.document.outline.GotoSubject(
    $rdf.sym(window.document.location.href),
    true,
    undefined,
    true,
    undefined
  )
}

export {
  versionInfo,
}
