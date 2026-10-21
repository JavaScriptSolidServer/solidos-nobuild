import { store } from 'solid-logic'
import { NamedNode } from 'rdflib'
import { getSocialPaneFromURI, getProfilePaneFromURI, getFolderPanesFromURI } from '../utils/paneUtils.js'
import { html, render } from 'lit-html'

import { isWebIdUri, loadProfileFromURI } from '../utils/webIdUtils.js'

import '../icons.js'
import '../components/navbar/index.js'

function showNavbar () {
  const navbar = document.querySelector('solid-panes-navbar')
  if (navbar) {
    navbar.classList.remove('navbar--hidden')
  }
}

function createNavItem (
  label,
  onSelected,
  selected = false
) {
  return {
    label,
    onSelected () {
      showNavbar()
      return onSelected()
    },
    selected
  }
}

async function createNavbarMenuItems (
  outliner,
  subject,
  outlineView,
  selectedPaneName,
  selectedPaneUri
) {
  const webId = await loadProfileFromURI(subject)
  const selectedPane = selectedPaneName || (isWebIdUri(subject) ? 'profile' : undefined)

  const menuItems = []

  if (webId) {
    menuItems.push(
      createNavItem('Profile', async () => {
        const profilePane = await getProfilePaneFromURI(webId)
        outliner.GotoSubject(subject, true, profilePane, true, undefined, outlineView)
      }, selectedPane === 'profile'),
      createNavItem('Friends', async () => {
        const socialPane = await getSocialPaneFromURI(webId)
        outliner.GotoSubject(subject, true, socialPane, true, undefined, outlineView)
      }, selectedPane === 'social')
    )
  }

  const storagePanes = await getFolderPanesFromURI(subject)
  storagePanes.forEach(pane => {
    menuItems.push(
      createNavItem(
        pane.label(),
        async () => {
          outliner.GotoSubject(subject, true, pane, true, undefined, outlineView)
        },
        selectedPane === pane.paneName &&
          (selectedPaneUri ? selectedPaneUri === pane.subject.value : storagePanes.length === 1)
      )
    )
  })

  return menuItems
}

export async function createNavbar (outliner) {
  const existingNavbar = document.querySelector('solid-panes-navbar')

  if (existingNavbar) {
    existingNavbar.classList.remove('navbar--hidden')
    return existingNavbar
  }

  const OutlineView = document.getElementById('OutlineView')
  const mainContent = document.getElementById('MainContent')
  const tmpContainer = document.createElement('div')
  const uri = window.location.href
  const subject = typeof uri === 'string' ? store.sym(uri) : uri
  const selectedPaneName = window.history.state?.paneName
  const selectedPaneUri = window.history.state?.paneUri
  let menuItems = await createNavbarMenuItems(outliner, subject, OutlineView, selectedPaneName, selectedPaneUri).catch((err) => {
    console.error('Failed to build navbar menu items:', err)
    return []
  })

  function setSelectedItem (selectedItem) {
    menuItems = menuItems.map((menuItem) => ({
      ...menuItem,
      selected: menuItem === selectedItem
    }))
  }

  function handleSelectionChanged (event) {
    const { detail: selectedItem } = event
    setSelectedItem(selectedItem)

    Promise.resolve(selectedItem.onSelected?.()).catch((error) => {
      console.error('Navbar menu item selection failed:', error)
    })

    renderNavbar()
  }

  function renderNavbar () {
    render(
      html`<solid-panes-navbar .navbarItems=${menuItems} @solid-ui-select=${handleSelectionChanged}></solid-panes-navbar>`,
      tmpContainer
    )
  }

  renderNavbar()

  const navbar = tmpContainer.firstElementChild

  if (!navbar) {
    throw new Error('Failed to create nav bar')
  }

  if (mainContent) {
    mainContent.insertBefore(navbar, mainContent.firstChild)
  } else {
    document.body.prepend(navbar)
  }

  return navbar
}
