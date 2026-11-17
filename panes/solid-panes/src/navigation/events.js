import { parseNavigationState,} from './state.js'

/** Dispatched on the document after a view has been displayed and its history entry written. */
export const NAVIGATED_EVENT = 'solid-panes:navigated'

/**
 * Whoever calls `GotoSubject` directly (links and buttons in solid-ui, mashlib) gets the same
 * follow-up as the main page's own navigation, because the page chrome listens for this.
 */
export function announceNavigation (doc) {
  const detail = {
    url: doc.location.href,
    state: parseNavigationState(doc.defaultView?.history.state)
  }
  doc.dispatchEvent(new CustomEvent(NAVIGATED_EVENT, { detail }))
}

/** Calls the listener after each navigation; returns a function that stops listening. */
export function onNavigated (listener, doc = document) {
  const handler = (event) => listener((event).detail)
  doc.addEventListener(NAVIGATED_EVENT, handler)
  return () => doc.removeEventListener(NAVIGATED_EVENT, handler)
}
