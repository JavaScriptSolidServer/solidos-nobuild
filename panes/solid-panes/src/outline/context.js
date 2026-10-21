// (type-only import removed: DataBrowserContext, PaneRegistry, RenderEnvironment from 'pane-registry')
import { getOutliner } from '../index.js'
// (type-only import removed: SolidLogic from 'solid-logic')
import { LiveStore } from 'rdflib'

export function createContext (
  dom,
  paneRegistry,
  store,
  logic,
  environment
) {
  return {
    dom,
    getOutliner,
    session: {
      paneRegistry,
      // @ts-ignore
      store,
      // @ts-ignore
      logic
    },
    environment
  }
}
