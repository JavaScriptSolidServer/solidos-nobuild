import { loadSheet } from '../../loadSheet.js'
import { ContextProvider } from '@lit/context'
import { html, LitElement,} from 'lit'
import { provide } from '@lit/context'

import {
  folderPaneContext,

} from '../../primitives/context.js'
const styles = await loadSheet(new URL('./FolderPaneProvider.styles.css', import.meta.url))

function createContextValue () {
  return {
    rootResource: undefined,
    displayedResource: undefined,
    activeContainer: undefined,
    view: 'grid',
    searchQuery: '',
    canCreate: false
  }
}

export default class FolderPaneProvider extends LitElement {
  static properties = {
    rootResource: { attribute: false },
    displayedResource: { attribute: false },
    activeContainer: { attribute: false },
    view: {},
    searchQuery: {},
    canCreate: { type: Boolean },
  }

  constructor () {
    super()
    this.__contextValueProvider = new ContextProvider(this, { context: folderPaneContext })
    this.rootResource = undefined
    this.displayedResource = undefined
    this.activeContainer = undefined
    this.view = 'grid'
    this.searchQuery = ''
    this.canCreate = false
    this.contextValue = createContextValue()
  }

  get contextValue () {
    return this.__contextValue
  }

  set contextValue (value) {
    this.__contextValueProvider.setValue(value)
    this.__contextValue = value
  }

  static styles = styles

  willUpdate (changedProperties) {
    super.willUpdate(changedProperties)
    if (
      changedProperties.has('rootResource') ||
      changedProperties.has('displayedResource') ||
      changedProperties.has('activeContainer') ||
      changedProperties.has('view') ||
      changedProperties.has('searchQuery') ||
      changedProperties.has('canCreate')
    ) {
      this.contextValue = {
        rootResource: this.rootResource,
        displayedResource: this.displayedResource,
        activeContainer: this.activeContainer,
        view: this.view,
        searchQuery: this.searchQuery,
        canCreate: this.canCreate
      }
    }
  }

  render () {
    return html`<slot></slot>`
  }
}

if (!customElements.get('folder-pane-provider')) customElements.define('folder-pane-provider', FolderPaneProvider)
