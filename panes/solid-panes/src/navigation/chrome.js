/*
 * The rules for what the page chrome shows, as pure functions.
 *
 * What the user sees depends on the page URL, the pane that was last opened, whether the
 * account menu opened it, who is logged in and whose pod the URL is in. These functions
 * decide it from those inputs alone: they read no history, DOM or session, so every rule
 * can be tested in one place. The heading, navbar, outline and file explorer provider
 * only apply the result.
 */

import {} from './state.js'

/** Registry names of the panes that present a person rather than a resource. */
export const PERSON_PANES = ['profile', 'social']

export function isPersonPane (paneName) {
  return paneName !== undefined && PERSON_PANES.includes(paneName)
}

/** Whether the heading over this pane offers to add its person as a friend: on the Profile and Friends tabs. */
export function offersFriendAction (paneName) {
  return isPersonPane(paneName)
}

/** The parts of a navbar item that the rules look at. */

// Profile heading

/**
 * Profile and friends panes present their own subject. Any other pane shows the owner of
 * the pod the page is in, unless that is the viewer, or the view came from the account menu
 * and so shows the viewer's own content.
 */
export function deriveHeading (input) {
  const { view, viaAccountMenu, viewer, pageUrl, owner, storageUris } = input
  const paneName = view.pane

  // Whether the pod owner's navbar has an item for the displayed pane: Profile and Friends
  // whenever there is an owner, and a storage by its URI (any of them when the view names none).
  const ownerHasPane = paneName === 'profile' || paneName === 'social'
    ? owner !== undefined
    : paneName === 'folder' && storageUris.some(uri => !view.subject || uri === view.subject)
  const ownerUri = ownerHasPane || !viaAccountMenu ? owner : undefined

  if (!isPersonPane(paneName)) {
    if (!ownerUri || ownerUri === viewer) return { mode: 'none' }
    return { mode: 'compact', subjectUri: ownerUri, paneName }
  }

  return {
    mode: paneName === 'profile' ? 'full' : 'compact',
    subjectUri: view.subject || (ownerHasPane ? owner : undefined) || pageUrl,
    paneName
  }
}

// Navbar

/** What the navbar should have selected: the displayed pane, or Profile on a WebID. */
export function deriveNavbarSelection (view, pageIsWebId) {
  return {
    paneName: view.pane ?? (pageIsWebId ? 'profile' : undefined),
    paneUri: view.subject
  }
}

/**
 * @param storageItemCount how many storage items the navbar has; a single storage is
 * selected even when the view does not say which one it was
 */
export function isNavbarItemSelected (
  item,
  selection,
  storageItemCount
) {
  if (!selection.paneName || item.paneName !== selection.paneName) return false
  if (item.paneName === 'folder') {
    return selection.paneUri ? selection.paneUri === item.paneUri : storageItemCount === 1
  }
  return true
}

/** The item to select for a pane: the one for that subject, else the first for that pane. */
export function pickNavbarItem (
  items,
  paneName,
  paneUri
) {
  const forPane = items.filter(item => item.paneName === paneName)
  return forPane.find(item => item.paneUri === paneUri) ?? forPane[0]
}

/** The navbar is not offered in the viewer's own pod, nor over account-menu content. */
export function isNavbarHidden (input) {
  return input.viaAccountMenu || input.ownProfile || input.inViewerPod
}

// Storage

/**
 * The viewer's own storage, and the server root, come with the folder pane's storage header.
 * Someone else's storage sits under the navbar of their pod, which already says whose it is.
 */
export function deriveStorageView (input) {
  return input.viaAccountMenu || input.inViewerPod || !input.hasOwner ? 'explorer' : 'storage'
}

// File explorer header

/** Whether the header describing a resource fits the view. */
export function deriveExplorerHeader (input) {
  if (input.isRootResource || input.isWebId) return false
  return !input.viewerPodOnly || input.inViewerPod
}

/**
 * The header is never shown over profile, friends, preferences or dashboard panes,
 * nor over a storage view, which has its own header or the navbar.
 */
export function explorerHeaderForPane (
  resourceHeader,
  paneName,
  folderView,
  solo = false
) {
  if (paneName === 'folder' || paneName === 'basicPreferences' || paneName === 'home' || paneName === 'dashboard') return false
  return resourceHeader && !isPersonPane(paneName)
}
