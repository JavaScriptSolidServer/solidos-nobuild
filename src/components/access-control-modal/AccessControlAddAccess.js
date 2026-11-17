import { loadSheet } from '../../lib/css.js'
import WebComponent from '../../lib/WebComponent.js'
import { html, nothing } from 'lit'
import { ACCESS_ROLES,} from 'solid-logic'

import '../../lib/icons.js'
import '../button/index.js'
import '../combobox/index.js'
import '../combobox-option/index.js'

const styles = await loadSheet(new URL('./AccessControlAddAccess.styles.css', import.meta.url))

export function directoryEntryOptionTemplate (entry) {
  return html`
    <span class="access-grants-directory-entry">
      ${renderDirectoryEntryIcon(entry)}
      <span>${entry.label}</span>
    </span>
  `
}

function renderDirectoryEntryIcon (entry) {
  if (entry.sources.includes('contacts') || entry.sources.includes('groups')) {
    return html`<icon-lucide-book-user style="width: 13px; height: 13px; flex: 0 0 13px;"></icon-lucide-book-user>`
  }

  if (entry.sources.includes('friends')) {
    return html`<icon-lucide-users style="width: 13px; height: 13px; flex: 0 0 13px;"></icon-lucide-users>`
  }

  if (entry.sources.includes('catalog')) {
    return html`<icon-lucide-user-round style="width: 13px; height: 13px; flex: 0 0 13px;"></icon-lucide-user-round>`
  }

  return nothing
}

export default class AccessControlAddAccess extends WebComponent {
  static properties = {
    principalInputValue: { attribute: false },
    addAccessRoleValue: { attribute: false },
    pendingAccessGrants: { attribute: false },
    inputError: { attribute: false },
    disabled: { type: Boolean },
    asyncOptionsProvider: { attribute: false },
  }

  constructor () {
    super()
    this.principalInputValue = ''
    this.addAccessRoleValue = 'Viewer'
    this.pendingAccessGrants = []
    this.inputError = ''
    this.disabled = false
    this.asyncOptionsProvider = null
  }

  static styles = styles

  onPrincipalInput (event) {
    const value = this.getEventValue(event)
    this.dispatchEvent(new CustomEvent('target-input', {
      detail: { value },
      bubbles: true,
      composed: true
    }))
  }

  onPrincipalSelect (event) {
    const option = event.detail.option
    if (typeof option.value !== 'string') {
      return
    }

    this.dispatchEvent(new CustomEvent('target-selected', {
      detail: {
        value: option.value,
        label: option.label,
        targetKind: option.targetKind
      },
      bubbles: true,
      composed: true
    }))
  }

  onRoleChange (event) {
    const role = event.detail.option.value
    const accessRole = typeof role === 'string'
      ? ACCESS_ROLES.find(candidate => candidate === role)
      : undefined
    if (!accessRole) {
      return
    }

    this.dispatchEvent(new CustomEvent('role-changed', {
      detail: { role: accessRole },
      bubbles: true,
      composed: true
    }))
  }

  onPendingGrantRemove (index) {
    this.dispatchEvent(new CustomEvent('pending-grant-removed', {
      detail: { index },
      bubbles: true,
      composed: true
    }))
  }

  getEventValue (event) {
    const target = event.currentTarget
    return typeof target?.value === 'string' ? target.value : ''
  }

  render () {
    return html`
      <section class="access-grants-form" aria-label="Add access">
        <p>Add person, group or software agent URL.</p>
        <div class="access-grants-form-main">
          <div class="access-grants-input">
            <solid-ui-combobox
              class="access-principal-combobox"
              .disabled=${this.disabled}
              label="Add person, group or software agent URL."
              .srOnlyLabel=${true}
              .value=${this.principalInputValue}
              placeholder="Paste a link or enter a name"
              .asyncOptionsProvider=${this.asyncOptionsProvider}
              @input=${this.onPrincipalInput}
              @change=${this.onPrincipalSelect}
            ></solid-ui-combobox>
            ${this.inputError
              ? html`<p class="access-principal-error" role="alert">${this.inputError}</p>`
              : nothing}
            ${this.renderPendingAccessGrants()}
          </div>
          <solid-ui-combobox
            class="access-role-select access-role-select--top"
            .disabled=${this.disabled}
            .value=${this.addAccessRoleValue}
            @change=${this.onRoleChange}
          >
            ${ACCESS_ROLES
              .filter(role => role !== 'No Access')
              .map(role => html`
                <solid-ui-combobox-option value=${role}>${role}</solid-ui-combobox-option>
              `)}
          </solid-ui-combobox>
        </div>
      </section>
    `
  }

  renderPendingAccessGrants () {
    if (!this.pendingAccessGrants.length) {
      return nothing
    }

    return html`
      <div class="access-grants-pending">
        ${this.pendingAccessGrants.map((grant, index) => html`
          <div class="access-grants-pending-item">
            <span class="access-grants-pending-item-label">
              ${grant.targetKind === 'trustedApp'
                ? html`<icon-lucide-globe style="width: 13px; height: 13px; vertical-align: -2px;"></icon-lucide-globe>`
                : nothing}
              ${grant.label}
            </span>
            <solid-ui-button
              type="button"
              variant="ghost"
              class="access-grants-pending-item-remove"
              ?disabled=${this.disabled}
              @click=${() => this.onPendingGrantRemove(index)}
            >
              <span class="sr-only">Remove ${grant.label}</span>
              <icon-lucide-circle-x slot="icon"></icon-lucide-circle-x>
            </solid-ui-button>
          </div>
        `)}
      </div>
    `
  }
}

if (!customElements.get('solid-ui-access-control-add-access')) customElements.define('solid-ui-access-control-add-access', AccessControlAddAccess)
