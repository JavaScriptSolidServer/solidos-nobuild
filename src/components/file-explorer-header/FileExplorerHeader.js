import { loadSheet } from '../../lib/css.js'
import { ContextConsumer } from '@lit/context'
import { sym } from 'rdflib'
import { solidLogicSingleton } from 'solid-logic'
import WebComponent from '../../lib/WebComponent.js'
import { DEFAULT_FILE_EXPLORER_CONTEXT, fileExplorerContext } from '../../lib/file-explorer/context.js'
import { FILE_EXPLORER_BACK_EVENT } from '../../lib/file-explorer/events.js'
import { consume } from '@lit/context'
import { html } from 'lit'
import '../../lib/icons.js'
const styles = await loadSheet(new URL('./FileExplorerHeader.styles.css', import.meta.url))
import './FileExplorerHeaderSummary.js'
import './FileExplorerHeaderControls.js'
// (type-only import removed: PaneIcon from './types.js')

export default class FileExplorerHeader extends WebComponent {
  static properties = {
    menuItems: { attribute: false },
    paneIcon: { attribute: false },
    showBack: { type: Boolean },
    responseMetadata: { state: true },
  }

  constructor () {
    super()
    this.fileExplorerContext = DEFAULT_FILE_EXPLORER_CONTEXT
    new ContextConsumer(this, { ...{ context: fileExplorerContext, subscribe: true }, callback: (value) => { this.fileExplorerContext = value } })
    this.menuItems = []
    this.paneIcon = undefined
    this.showBack = true
    this.responseMetadata = {
      modified: undefined,
      isPublic: false,
      canEdit: false,
      canManageAccess: false,
      aclUri: undefined
    }
  }

  static styles = styles

  _loadedMetadataForUri
  _metadataGeneration = 0

  handleBack = () => {
    this.dispatchEvent(new CustomEvent(FILE_EXPLORER_BACK_EVENT, {
      bubbles: true,
      composed: true,
      detail: {
        subjectUri: this.fileExplorerContext.subjectUri
      }
    }))
  }

  getDefaultResponseMetadata () {
    return {
      modified: undefined,
      isPublic: false,
      canEdit: false,
      canManageAccess: false,
      aclUri: undefined
    }
  }

  willUpdate () {
    const subjectUri = this.fileExplorerContext?.subjectUri
    if (this.fileExplorerContext?.store && subjectUri && this._loadedMetadataForUri !== subjectUri) {
      this._loadedMetadataForUri = subjectUri
      const generation = ++this._metadataGeneration
      this.responseMetadata = this.getDefaultResponseMetadata()
      this.loadResponseMetadata(subjectUri, generation)
    }
  }

  async loadResponseMetadata (subjectUri, generation) {
    try {
      const metadata = await solidLogicSingleton.resource.fetchMetadata(sym(subjectUri))
      if (generation === this._metadataGeneration && this.fileExplorerContext.subjectUri === subjectUri) {
        this.responseMetadata = {
          modified: metadata.modified,
          isPublic: metadata.access.isPublic,
          canEdit: metadata.access.canEdit,
          canManageAccess: metadata.access.canManageAccess,
          aclUri: metadata.aclUri
        }
      }
    } catch (error) {
      if (generation === this._metadataGeneration && this.fileExplorerContext.subjectUri === subjectUri) {
        this.responseMetadata = this.getDefaultResponseMetadata()
        console.warn('Failed to load response metadata', error)
      }
    }
  }

  render () {
    return html`
      <header>
        <solid-ui-file-explorer-header-summary
          .paneIcon=${this.paneIcon}
          .showBack=${this.showBack}
          .onBackClick=${this.handleBack}
          .responseMetadata=${this.responseMetadata}
        ></solid-ui-file-explorer-header-summary>
        <solid-ui-file-explorer-header-controls
          .menuItems=${this.menuItems}
          .canEdit=${this.responseMetadata.canEdit}
          .canManageAccess=${this.responseMetadata.canManageAccess}
        ></solid-ui-file-explorer-header-controls>
      </header>
    `
  }
}

if (!customElements.get('solid-ui-file-explorer-header')) customElements.define('solid-ui-file-explorer-header', FileExplorerHeader)
