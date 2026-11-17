/*
 * What a history entry records about the view that was displayed.
 *
 * This is the only module that knows how that is stored in `history.state`; everything
 * else works with `NavigationState`. The stored fields are `paneName`, `paneUri` and
 * `viaAccountMenu`, next to whatever other keys the entry carries.
 */

const KIND_BY_PANE = {
  profile: 'profile',
  social: 'friends',
  folder: 'storage'
}

function asRecord (raw) {
  return raw !== null && typeof raw === 'object' ? raw : {}
}

export function viewFromPane (pane, subject) {
  if (!pane) return { kind: 'default' }
  return { kind: KIND_BY_PANE[pane] ?? 'pane', pane, ...(subject ? { subject } : {}) }
}

export function parseNavigationState (raw) {
  const { paneName, paneUri, viaAccountMenu } = asRecord(raw)
  return {
    view: viewFromPane(
      typeof paneName === 'string' && paneName ? paneName : undefined,
      typeof paneUri === 'string' && paneUri ? paneUri : undefined
    ),
    viaAccountMenu: viaAccountMenu === true
  }
}

export function readNavigationState () {
  return parseNavigationState(window.history.state)
}

const historyWrites = new WeakMap()

/** Whether a synchronous history write is being made by this application. */
export function isWritingNavigationHistory (history) {
  return (historyWrites.get(history) ?? 0) > 0
}

/** Write an entry without treating its synchronous Navigation API event as browser navigation. */
export function writeNavigationHistory (
  history,
  method,
  state,
  title,
  url
) {
  historyWrites.set(history, (historyWrites.get(history) ?? 0) + 1)
  try {
    history[method](state, title, url)
  } finally {
    const remaining = (historyWrites.get(history) ?? 1) - 1
    if (remaining) historyWrites.set(history, remaining)
    else historyWrites.delete(history)
  }
}

/**
 * The state to store for an entry after displaying something.
 *
 * Pane details describe what was displayed, so they must not leak into the entry of
 * another URL, nor outlive the pane they were saved for. The account-menu marker
 * keeps a later page load from restoring the viewer's content over the URL's subject.
 */
export function nextHistoryState (current, change) {
  const next = { ...asRecord(current) }

  if (change.pane) {
    next.paneName = change.pane.name
    if (typeof change.pane.subject === 'string') next.paneUri = change.pane.subject
  }
  if (change.leavingPage && !change.pane) delete next.paneName
  if ((change.leavingPage && !change.pane) || (change.pane && !change.pane.subject)) delete next.paneUri

  if (change.viaAccountMenu) next.viaAccountMenu = true
  else delete next.viaAccountMenu

  return next
}

/** The state without anything about the displayed pane. */
export function withoutPaneState (raw) {
  const { paneName, paneUri, viaAccountMenu, ...rest } = asRecord(raw)
  return rest
}

/** Forget what the current entry displayed, so the URL alone decides what to show. */
export function clearPaneState () {
  writeNavigationHistory(window.history, 'replaceState', withoutPaneState(window.history.state), '', window.location.href)
}
