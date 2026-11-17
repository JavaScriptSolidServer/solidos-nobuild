import { html, render } from 'lit-html'

import '../icons.js'
import '../components/header/index.js'
import { getFolderPanesFromURI } from '../utils/paneUtils.js'
import { getCurrentViewer } from '../utils/viewerUtils.js'

export async function createHeader (navigation) {
  const existingHeader = document.querySelector('solid-panes-header')

  if (existingHeader) {
    return existingHeader
  }

  const viewer = await getCurrentViewer()
  const storagePanes = viewer ? await getFolderPanesFromURI(viewer) : []
  const main = document.getElementById('MainContent')
  const tmpContainer = document.createElement('div')
  const storageMenuItems = storagePanes.map(pane => ({
    label: html`<icon-lucide-folder-open slot="left-icon"></icon-lucide-folder-open> ${pane.label()}`,
    async onSelected () {
      if (await getCurrentViewer()) {
        await navigation.show({ kind: 'storage', pane, source: 'accountMenu' })
      }
    }
  }))
  const menuItems = [
    {
      label: html`<icon-lucide-user slot="left-icon"></icon-lucide-user> Profile`,
      async onSelected () {
        const currentViewer = await getCurrentViewer()
        if (currentViewer) {
          await navigation.show({ kind: 'profile', subject: currentViewer.value, source: 'accountMenu' })
        }
      }
    },
    {
      label: html`<icon-lucide-users slot="left-icon"></icon-lucide-users> Friends`,
      async onSelected () {
        const currentViewer = await getCurrentViewer()
        if (currentViewer) {
          await navigation.show({ kind: 'friends', subject: currentViewer.value, source: 'accountMenu' })
        }
      }
    },
    ...storageMenuItems,
    {
      label: html`<icon-lucide-layout-dashboard slot="left-icon"></icon-lucide-layout-dashboard> Dashboard`,
      async onSelected () {
        if (await getCurrentViewer()) {
          await navigation.show({ kind: 'app', pane: 'home', source: 'accountMenu' })
        }
      }
    },
    {
      label: html`<icon-lucide-settings-2 slot="left-icon"></icon-lucide-settings-2> Preferences`,
      async onSelected () {
        if (await getCurrentViewer()) {
          await navigation.show({ kind: 'app', pane: 'basicPreferences', source: 'accountMenu' })
        }
      }
    },
  ]

  render(
    html`<solid-panes-header .menuItems=${menuItems}></solid-panes-header>`,
    tmpContainer
  )

  const header = tmpContainer.firstElementChild

  if (!header) {
    throw new Error('Failed to create header')
  }

  // ensure it is in DOM (before MainContent for consistency)
  if (main && main.parentNode) {
    main.parentNode.insertBefore(header, main)
  } else {
    document.body.prepend(header)
  }

  return header
}
