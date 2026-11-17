import * as paneRegistry from 'pane-registry'
const folderIcon = new URL('../icons/folder.svg', import.meta.url).href
const personIcon = new URL('../icons/person.svg', import.meta.url).href
const friendsIcon = new URL('../icons/friends.svg', import.meta.url).href
import { isWebIdUri, loadProfileFromURI } from './webIdUtils.js'
import { getPodStorages } from './podUtils.js'
import { NamedNode, sym } from 'rdflib'

const FOLDER_ICON = folderIcon
const PERSON_ICON = personIcon
const FRIENDS_ICON = friendsIcon

export function createPaneItem (
  pane,
  subject,
  paneName,
  labelText,
  icon,
  tabName
) {
  return {
    name: pane.name,
    paneName,
    tabName,
    label: function () {
      return labelText
    },
    render: function (_subject, context, options) {
      // Storage is an explicit browser view, even though GotoSubject uses solo for top-level navigation.
      return pane.render(subject, context, paneName === 'folder' ? { ...options, solo: false, fullView: false } : options)
    },
    shouldGetFocus: function () {
      return false
    },
    requireQueryButton: !!pane.requireQueryButton,
    subject,
    icon
  }
}

export async function getPaneItemFromURI (
  paneName,
  subject,
  labelText = 'Pane',
  icon = '',
  byName = paneRegistry.byName
) {
  const windowHref = new URL(window.location.href)
  const finalURL = subject || sym(windowHref.toString())
  const webId = await loadProfileFromURI(finalURL)
  if (!webId || !webId.value) return null

  const pane = byName(paneName)
  if (!pane) return null

  return createPaneItem(pane, webId, paneName, labelText, icon)
}

export async function getProfilePaneFromURI (subject, byName = paneRegistry.byName) {
  if (subject && isWebIdUri(subject)) {
    const pane = byName('profile')
    return pane
      ? createPaneItem(pane, subject, 'profile', 'Profile', PERSON_ICON)
      : null
  }
  return getPaneItemFromURI('profile', subject, 'Profile', PERSON_ICON, byName)
}

export async function getSocialPaneFromURI (subject, byName = paneRegistry.byName) {
  return getPaneItemFromURI('social', subject, 'Social', FRIENDS_ICON, byName)
}

export async function getFolderPaneForStorage (podUrl, label) {
  const folderPane = paneRegistry.byName('folder')
  if (!folderPane) return null

  return createPaneItem(folderPane, podUrl, folderPane.name, label || 'Storage', FOLDER_ICON)
}
export async function getFolderPanesFromURI (subject) {
  const podStorages = await getPodStorages(subject)
  if (podStorages.length === 0) return []

  return Promise.all(
    podStorages.map((pod, index) =>
      getFolderPaneForStorage(
        pod,
        podStorages.length > 1 ? `Storage ${index + 1}` : 'Storage'
      )
    )
  ).then(panes => panes.filter((pane) => pane !== null))
}
