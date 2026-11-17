import { sym } from 'rdflib'
import { isOwnWebIdProfile } from '../utils/webIdUtils.js'
import { isNavbarHidden } from './chrome.js'
import { isPageInViewerPod } from './podContext.js'

const NAVBAR_HIDDEN_CLASS = 'navbar--hidden'
let revision = 0

/** Show or hide the navbar, if the page has one. */
export function setNavbarHidden (hidden) {
  ++revision
  document.querySelector('solid-panes-navbar')?.classList.toggle(NAVBAR_HIDDEN_CLASS, hidden)
}

/** Apply ownership rules without letting an older lookup overwrite a newer navigation. */
export async function refreshNavbarVisibility (url, viaAccountMenu = false) {
  const request = ++revision
  const ownProfile = isOwnWebIdProfile(sym(url))
  if (viaAccountMenu || ownProfile) {
    setNavbarHidden(true)
    return
  }

  const inViewerPod = await isPageInViewerPod(url)
  if (request !== revision) return
  setNavbarHidden(isNavbarHidden({ viaAccountMenu, ownProfile, inViewerPod }))
}
