import { loadSheet } from '../../loadSheet.js'
import { WebComponent } from 'solid-ui'
import { html, nothing } from 'lit'
import 'solid-ui/components/button'
import 'solid-ui/components/menu'
import 'solid-ui/components/menu-item'
import '../../icons.js'
import { LiveStore } from 'rdflib'
const styles = await loadSheet(new URL('./ResourceActionsMenu.styles.css', import.meta.url))
import { isContainerSubject } from '../../utils/podUtils.js'
export default class ResourceActionsMenu extends WebComponent {
  static properties = {
    store: { attribute: false },
    subjectUri: { type: String },
    handleAccessClick: { attribute: false },
    handleEditingClick: { attribute: false },
    paneSupportsEditing: { type: Boolean },
    canEdit: { type: Boolean },
    isMobile: { type: Boolean },
    menuItems: { attribute: false },
  }

  constructor () {
    super()
    this.handleAccessClick = undefined
    this.handleEditingClick = undefined
    this.paneSupportsEditing = false
    this.canEdit = false
    this.isMobile = false
    this.menuItems = []
  }

  static styles = styles

  render () {
    const isContainerResource = isContainerSubject(this.store, this.subjectUri)
    const canEdit = !isContainerResource && this.isMobile && this.paneSupportsEditing && this.canEdit && !!this.handleEditingClick
    const canManageAccess = !!this.handleAccessClick
    return html`
      <solid-ui-menu>
        <solid-ui-button slot="trigger" class="file-explorer-header-more-button" variant="ghost" title="More options">
          <icon-lucide-ellipsis-vertical slot="icon" class="ellipsisIcon"></icon-lucide-ellipsis-vertical>
        </solid-ui-button>
        ${this.menuItems.map(item => html`
          <solid-ui-menu-item @solid-ui-select=${(event) => item.action(event)}>
            ${item.icon}
            ${item.label}
          </solid-ui-menu-item>
        `)}
        ${canEdit
          ? html`
              <solid-ui-menu-item @solid-ui-select=${this.handleEditingClick}>
                <icon-lucide-pencil slot="left-icon"></icon-lucide-pencil>
                Edit
              </solid-ui-menu-item>
            `
          : nothing}
        ${!isContainerResource && this.isMobile && canManageAccess
          ? html`
              <solid-ui-menu-item @solid-ui-select=${this.handleAccessClick}>
                <icon-lucide-user-round-cog slot="left-icon"></icon-lucide-user-round-cog>
                Manage Access
              </solid-ui-menu-item>
            `
          : nothing}
        ${isContainerResource && canManageAccess
          ? html`
              <solid-ui-menu-item @solid-ui-select=${this.handleAccessClick}>
                <icon-lucide-user-round-cog slot="left-icon"></icon-lucide-user-round-cog>
                Manage Access
              </solid-ui-menu-item>
            `
          : nothing}
      </solid-ui-menu>
    `
  }
}

if (!customElements.get('resource-actions-menu')) customElements.define('resource-actions-menu', ResourceActionsMenu)
