import { loadSheet } from '../../lib/css.js'
import WebComponent from '../../lib/WebComponent.js'
import { html, nothing } from 'lit'
import '../button/index.js'
import '../menu/index.js'
import '../menu-item/index.js'
import '../../lib/icons.js'
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
    canManageAccess: { type: Boolean },
    isMobile: { type: Boolean },
    showAccessInMenu: { type: Boolean, attribute: 'show-access-in-menu' },
    menuItems: { attribute: false },
  }

  constructor () {
    super()
    this.handleAccessClick = undefined
    this.handleEditingClick = undefined
    this.paneSupportsEditing = false
    this.canEdit = false
    this.canManageAccess = false
    this.isMobile = false
    this.showAccessInMenu = false
    this.menuItems = []
  }

  static styles = styles

  handleOpenInNewTab = () => {
    if (!this.subjectUri) return
    window.open(this.subjectUri, '_blank', 'noopener,noreferrer')
  }

  render () {
    const isContainerResource = isContainerSubject(this.store, this.subjectUri)
    const canEdit = !isContainerResource && this.isMobile && this.paneSupportsEditing && this.canEdit && !!this.handleEditingClick
    const canManageAccess = this.canManageAccess && !!this.handleAccessClick &&
      (this.showAccessInMenu || this.isMobile)
    const actionableMenuItems = this.menuItems.filter((item) => typeof item.action === 'function')
    return html`
      <solid-ui-menu>
        <solid-ui-button slot="trigger" class="file-explorer-header-more-button" variant="ghost" title="More options">
          <icon-lucide-ellipsis-vertical slot="icon" class="ellipsisIcon"></icon-lucide-ellipsis-vertical>
          <span class="sr-only">More options</span>
        </solid-ui-button>
        ${actionableMenuItems.map(item => html`
          <solid-ui-menu-item @solid-ui-select=${(event) => item.action(event)}>
            ${typeof item.icon === 'string'
              ? html`<img slot="left-icon" src=${item.icon} alt="">`
              : item.icon ?? html`<icon-lucide-file slot="left-icon" aria-hidden="true"></icon-lucide-file>`}
            ${item.label}
          </solid-ui-menu-item>
        `)}
        ${this.subjectUri
          ? html`
              <solid-ui-menu-item @solid-ui-select=${this.handleOpenInNewTab}>
                <icon-lucide-square-arrow-out-up-right slot="left-icon"></icon-lucide-square-arrow-out-up-right>
                Open in New Tab
              </solid-ui-menu-item>
            `
          : nothing}
        ${canEdit
          ? html`
              <solid-ui-menu-item @solid-ui-select=${this.handleEditingClick}>
                <icon-lucide-pencil slot="left-icon"></icon-lucide-pencil>
                Edit
              </solid-ui-menu-item>
            `
          : nothing}
        ${canManageAccess
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

if (!customElements.get('solid-ui-resource-actions-menu')) customElements.define('solid-ui-resource-actions-menu', ResourceActionsMenu)
