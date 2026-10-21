import { loadSheet } from '../../loadSheet.js'
import { ContextConsumer } from '@lit/context'
import { WebComponent } from 'solid-ui'
import { consume } from '@lit/context'
import { html, nothing } from 'lit'
import 'solid-ui/components/button'
import '../../icons.js'
const styles = await loadSheet(new URL('./FileExplorerHeaderControls.styles.css', import.meta.url))
import '../resource-actions-menu/ResourceActionsMenu.js'
import { fileExplorerContext,} from 'solid-ui'
import { isContainerSubject } from '../../utils/podUtils.js'

export default class FileExplorerHeaderControls extends WebComponent {
  static properties = {
    menuItems: { attribute: false },
    canEdit: { type: Boolean },
    isMobile: { state: true },
  }

  constructor () {
    super()
    this.fileExplorerContext = undefined
    new ContextConsumer(this, { ...{ context: fileExplorerContext, subscribe: true }, callback: (value) => { this.fileExplorerContext = value } })
    this.menuItems = []
    this.canEdit = false
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

  renderDirtyIndicator () {
    if (!this.fileExplorerContext.edit?.isDirty) return nothing

    return html`<span class="dirtyIndicator" title="This file has unsaved changes">Unsaved</span>`
  }

  render () {
    const isContainerResource = isContainerSubject(this.fileExplorerContext.store, this.fileExplorerContext.subjectUri)
    const supportsEditing = this.fileExplorerContext.paneSupportsEditing

    return html`
      <div>
        ${this.renderDirtyIndicator()}
        ${!isContainerResource && !this.isMobile
          ? html`
              <solid-ui-button class="file-explorer-header-action-button" variant="ghost" title="Manage Access" @click=${this.fileExplorerContext.handleAccessClick}>
                <icon-lucide-user-round-cog slot="icon"></icon-lucide-user-round-cog>
              </solid-ui-button>
              ${supportsEditing
                ? html`
                    <solid-ui-button
                      class="file-explorer-header-action-button"
                      variant="ghost"
                      title=${this.getEditTooltip()}
                      ?disabled=${!this.canEdit}
                      @click=${this.fileExplorerContext.edit?.onEdit}
                    >
                      <icon-lucide-pencil slot="icon"></icon-lucide-pencil>
                    </solid-ui-button>
                  `
                : nothing}
            `
          : nothing}
        <resource-actions-menu
          .store=${this.fileExplorerContext.store}
          .handleAccessClick=${this.fileExplorerContext.handleAccessClick}
          .handleEditingClick=${this.fileExplorerContext.edit?.onEdit}
          .paneSupportsEditing=${this.fileExplorerContext.paneSupportsEditing}
          .canEdit=${this.canEdit}
          .subjectUri=${this.fileExplorerContext?.subjectUri}
          .menuItems=${this.menuItems}
          .isMobile=${this.isMobile}
        ></resource-actions-menu>
      </div>
    `
  }
}

if (!customElements.get('file-explorer-header-controls')) customElements.define('file-explorer-header-controls', FileExplorerHeaderControls)
