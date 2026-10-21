import { loadSheet } from '../../loadSheet.js'
import { ContextConsumer } from '@lit/context'
import { sym } from 'rdflib'
import { WebComponent, fileExplorerContext } from 'solid-ui'
import { consume } from '@lit/context'
import { html } from 'lit'
import '../../icons.js'
const styles = await loadSheet(new URL('./FileExplorerHeader.styles.css', import.meta.url))
import './FileExplorerHeaderSummary.js'
import './FileExplorerHeaderControls.js'
// (type-only import removed: PaneIcon from './types.js')
import { fetchResourceMetadata } from '../../utils/podUtils.js'
import {} from './types.js'
export default class FileExplorerHeader extends WebComponent {
  static properties = {
    menuItems: { attribute: false },
    paneIcon: { attribute: false },
    responseMetadata: { state: true },
  }

  constructor () {
    super()
    this.fileExplorerContext = undefined
    new ContextConsumer(this, { ...{ context: fileExplorerContext, subscribe: true }, callback: (value) => { this.fileExplorerContext = value } })
    this.menuItems = []
    this.paneIcon = undefined
    this.responseMetadata = {
      modified: undefined,
      isPublic: false,
      canEdit: false,
      aclUri: undefined
    }
  }

  static styles = styles

  _loadedMetadataForUri
  getDefaultResponseMetadata () {
    return {
      modified: undefined,
      isPublic: false,
      canEdit: false,
      aclUri: undefined
    }
  }

  updated () {
    if (this.fileExplorerContext?.store && this.fileExplorerContext.subjectUri && this._loadedMetadataForUri !== this.fileExplorerContext.subjectUri) {
      this._loadedMetadataForUri = this.fileExplorerContext.subjectUri
      this.loadResponseMetadata()
    }
  }

  async loadResponseMetadata () {
    if (!this.fileExplorerContext?.store || !this.fileExplorerContext.subjectUri) return

    try {
      const metadata = await fetchResourceMetadata(this.fileExplorerContext.store, sym(this.fileExplorerContext.subjectUri))
      this.responseMetadata = {
        modified: metadata.modified,
        isPublic: metadata.isPublic,
        canEdit: metadata.canEdit,
        aclUri: metadata.aclUri
      }
    } catch (error) {
      this.responseMetadata = this.getDefaultResponseMetadata()
      console.warn('Failed to load response metadata', error)
    }
  }

  render () {
    return html`
      <header>
        <file-explorer-header-summary
          .paneIcon=${this.paneIcon}
          .onBackClick=${this.fileExplorerContext?.onBack}
          .responseMetadata=${this.responseMetadata}
        ></file-explorer-header-summary>
        <file-explorer-header-controls
          .menuItems=${this.menuItems}
          .canEdit=${this.responseMetadata.canEdit}
        ></file-explorer-header-controls>
      </header>
    `
  }
}

if (!customElements.get('file-explorer-header')) customElements.define('file-explorer-header', FileExplorerHeader)
