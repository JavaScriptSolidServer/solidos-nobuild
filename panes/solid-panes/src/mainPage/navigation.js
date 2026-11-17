
import * as paneRegistry from 'pane-registry'

import { createNavigationController,} from '../navigation/controller.js'
import { selectNavbarPane } from './navbar.js'
import { refreshProfileHeading } from './profileHeading.js'

const controllers = new WeakMap()

/** The page's navigation controller for an outliner, created on first use. */
export function navigationFor (outliner, store) {
  let controller = controllers.get(outliner)
  if (!controller) {
    const registry = (outliner).context?.session?.paneRegistry
    const byName = typeof registry?.byName === 'function'
      ? registry.byName.bind(registry)
      : paneRegistry.byName
    controller = createNavigationController({
      store,
      outliner,
      byName,
      effects: { selectNavbarPane, refreshHeading: refreshProfileHeading }
    })
    controllers.set(outliner, controller)
  }
  return controller
}
