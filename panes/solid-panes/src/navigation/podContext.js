/*
 * Whose pod the page is in, and which storages the viewer owns.
 *
 * Several parts of the page need this: the navbar builds its items from it, the profile heading
 * shows the owner, and the outline decides whether the file explorer header fits. Each part is
 * looked up once and cached, so they no longer each look it up, or read it back from each
 * other's DOM.
 */

import { authn } from 'solid-logic'
import { sym } from 'rdflib'
import { isWebIdUri, loadProfileFromURI } from '../utils/webIdUtils.js'
import { getFolderPanesFromURI,} from '../utils/paneUtils.js'
import { getPodStorages } from '../utils/podUtils.js'

const MAX_REMEMBERED = 500

// What was found depends on different parts of the URL, so each part is remembered on its own:
// - the owner depends on the document: the profile lookup can end with that document's own
//   foaf:primaryTopic, so two pages of one pod may not share an owner
// - the storages depend on the pod, derived from the origin and the first path segment
// - the viewer's storages depend only on who the viewer is
const owners = new Map()
const storages = new Map()
const viewerStorages = new Map()

function podKey (pageUrl) {
  try {
    const url = new URL(pageUrl)
    const [first = ''] = url.pathname.split('/').filter(Boolean)
    return `${url.origin}|${first}`
  } catch {
    return pageUrl
  }
}

function documentKey (pageUrl) {
  return sym(pageUrl).doc().uri
}

/**
 * Remembers a lookup, unless it failed: a failure is not kept, so that the next request asks again.
 */
function remember (
  cache,
  key,
  what,
  load,
  fallback
) {
  const existing = cache.get(key)
  if (existing) return existing

  const created = load().catch(error => {
    console.warn(`Could not load the ${what} for ${key}`, error)
    if (cache.get(key) === created) cache.delete(key)
    return fallback
  })
  cache.set(key, created)
  if (cache.size > MAX_REMEMBERED) cache.delete(cache.keys().next().value)
  return created
}

function ownerOf (pageUrl) {
  return remember(owners, documentKey(pageUrl), 'owner of the pod', async () => {
    const subject = sym(pageUrl)
    const webId = await loadProfileFromURI(subject)
    // The lookup falls back to the URL itself when it finds no profile
    return webId.uri === subject.uri && !isWebIdUri(subject) ? undefined : webId.value
  }, undefined)
}

function storagesOf (pageUrl, owner) {
  const storageSubject = owner ? sym(owner) : sym(pageUrl)
  return remember(storages, podKey(pageUrl), 'storages of the pod', () => getFolderPanesFromURI(storageSubject), [])
}

function storagesOfViewer (viewer) {
  if (!viewer) return Promise.resolve([])
  return remember(viewerStorages, viewer, 'storages of the viewer', async () => {
    return (await getPodStorages(sym(viewer))).map(storage => storage.uri)
  }, [])
}

/** The context for the pod a URL is in; the page's own URL by default. */
export async function getPodContext (pageUrl = window.location.href) {
  const viewer = authn.currentUser()?.value
  const [owner, ownStorages] = await Promise.all([
    ownerOf(pageUrl), storagesOfViewer(viewer)
  ])
  const storagePanes = await storagesOf(pageUrl, owner)
  return { viewer, owner, storagePanes, viewerStorages: ownStorages }
}

/** Forget what was loaded, for example when tests start over. */
export function resetPodContexts () {
  owners.clear()
  storages.clear()
  viewerStorages.clear()
}

/** Whether two contexts describe the same pod, so that a navbar built from one fits the other. */
export function isSamePod (a, b) {
  return a.owner === b.owner && a.viewer === b.viewer &&
    a.storagePanes.map(pane => pane.subject.value).join() === b.storagePanes.map(pane => pane.subject.value).join()
}

export function isInViewerPod (context, url) {
  return context.viewerStorages.some(storage => url.startsWith(storage))
}

/** Whether the URL lies within one of the viewer's own storages. */
export async function isPageInViewerPod (url) {
  return isInViewerPod(await getPodContext(url), url)
}
