import { loadSheet } from '../../lib/css.js'
import { ContextConsumer } from '@lit/context'
import WebComponent from '../../lib/WebComponent.js'
import { consume } from '@lit/context'
import { html, nothing } from 'lit'
import '../button/index.js'
import '../../lib/icons.js'
const styles = await loadSheet(new URL('./FileExplorerHeaderControls.styles.css', import.meta.url))
import '../resource-actions-menu/ResourceActionsMenu.js'
import { DEFAULT_FILE_EXPLORER_CONTEXT, fileExplorerContext } from '../../lib/file-explorer/context.js'
import { FILE_EXPLORER_OPEN_PANE_EVENT } from '../../lib/file-explorer/events.js'
import { isContainerSubject } from '../../utils/podUtils.js'

export default class FileExplorerHeaderControls extends WebComponent {
  static properties = {
    menuItems: { attribute: false },
    canEdit: { type: Boolean },
    canManageAccess: { type: Boolean },
    isMobile: { state: true },
  }

  constructor () {
    super()
    this.fileExplorerContext = DEFAULT_FILE_EXPLORER_CONTEXT
    new ContextConsumer(this, { ...{ context: fileExplorerContext, subscribe: true }, callback: (value) => { this.fileExplorerContext = value } })
    this.menuItems = []
    this.canEdit = false
    this.canManageAccess = false
    this.isMobile = typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(max-width: 600px)').matches
      : false
  }

  static styles = styles

  mobileMediaQuery
  mobileQuery = '(max-width: 600px)'
  handleMobileMediaChange = (event) => {
    this.isMobile = event.matches
  }

  connectedCallback () {
    super.connectedCallback()

    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return
    }

    this.mobileMediaQuery = window.matchMedia(this.mobileQuery)
    this.isMobile = this.mobileMediaQuery.matches
    this.mobileMediaQuery.addEventListener('change', this.handleMobileMediaChange)
  }

  disconnectedCallback () {
    this.mobileMediaQuery?.removeEventListener('change', this.handleMobileMediaChange)
    this.mobileMediaQuery = undefined
    super.disconnectedCallback()
  }

  // TODO: Add broken then use this function to set tooltip and disable edit button
  /* private setEditable() {
    const sourcePaneState = this.sourceContext?.sourcePaneState
    const { canEdit } = this.sourceContext?.headerMetadata ?? { canEdit: false }
    const subject = this.sourceContext?.subject
    if (!sourcePaneState || !canEdit || sourcePaneState.broken || (subject && subject.endsWith('/'))) return

    this.sourceContext?.setEditing?.()
  } */

  getEditTooltip () {
    if (!this.canEdit) return 'No Access'
    return 'Edit'
  }

  handleManageAccess = () => {
    const subjectUri = this.fileExplorerContext.subjectUri
    if (!subjectUri) return

    this.dispatchEvent(new CustomEvent(FILE_EXPLORER_OPEN_PANE_EVENT, {
      bubbles: true,
      composed: true,
      detail: { subjectUri, paneName: 'sharing' }
    }))
  }

  renderDirtyIndicator () {
    if (!this.fileExplorerContext.isDirty) return nothing

    return html`<span class="dirtyIndicator" title="This file has unsaved changes">Unsaved</span>`
  }

  render () {
    const isContainerResource = isContainerSubject(this.fileExplorerContext.store, this.fileExplorerContext.subjectUri)
    const supportsEditing = this.fileExplorerContext.canEdit

    return html`
      <div>
        ${this.renderDirtyIndicator()}
        ${!isContainerResource && !this.isMobile && this.canManageAccess
          ? html`
              <solid-ui-button class="file-explorer-header-action-button" variant="ghost" title="Manage Access" @click=${this.handleManageAccess}>
                <icon-lucide-user-round-cog slot="icon"></icon-lucide-user-round-cog>
                <span class="sr-only">Manage access</span>
              </solid-ui-button>
              ${supportsEditing
                ? html`
                    <solid-ui-button
                      class="file-explorer-header-action-button"
                      variant="ghost"
                      title=${this.getEditTooltip()}
                      ?disabled=${!this.canEdit}
                      @click=${this.fileExplorerContext.beginEditing}
                    >
                      <icon-lucide-pencil slot="icon"></icon-lucide-pencil>
                      <span class="sr-only">Edit</span>
                    </solid-ui-button>
                  `
                : nothing}
            `
          : nothing}
        <solid-ui-resource-actions-menu
          .store=${this.fileExplorerContext.store}
          .handleAccessClick=${this.handleManageAccess}
          .handleEditingClick=${this.fileExplorerContext.beginEditing}
          .paneSupportsEditing=${this.fileExplorerContext.canEdit}
          .canEdit=${this.canEdit}
          .canManageAccess=${this.canManageAccess}
          .subjectUri=${this.fileExplorerContext.subjectUri}
          .menuItems=${this.menuItems}
          .isMobile=${this.isMobile}
        ></solid-ui-resource-actions-menu>
      </div>
    `
  }
}

if (!customElements.get('solid-ui-file-explorer-header-controls')) customElements.define('solid-ui-file-explorer-header-controls', FileExplorerHeaderControls)
