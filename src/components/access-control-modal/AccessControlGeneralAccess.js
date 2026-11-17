import { loadSheet } from '../../lib/css.js'
import WebComponent from '../../lib/WebComponent.js'
import { html } from 'lit'
import { ACCESS_ROLES, PUBLIC_ACCESS_ROLES,} from 'solid-logic'
import * as debug from '../../lib/debug.js'

import '../../lib/icons.js'
import '../button/index.js'
import '../combobox/index.js'
import '../combobox-option/index.js'

const styles = await loadSheet(new URL('./AccessControlGeneralAccess.styles.css', import.meta.url))

export default class AccessControlGeneralAccess extends WebComponent {
  static properties = {
    subjectUri: { attribute: false },
    authenticatedAccessRoleValue: { attribute: false },
    publicAccessRoleValue: { attribute: false },
    disabled: { type: Boolean },
  }

  constructor () {
    super()
    this.subjectUri = undefined
    this.authenticatedAccessRoleValue = 'No Access'
    this.publicAccessRoleValue = 'No Access'
    this.disabled = false
  }

  static styles = styles

  onAuthenticatedRoleChange (event) {
    this.dispatchRoleChange('authenticated-role-changed', event, ACCESS_ROLES)
  }

  onPublicRoleChange (event) {
    this.dispatchRoleChange('public-role-changed', event, PUBLIC_ACCESS_ROLES)
  }

  dispatchRoleChange (
    eventName,
    event,
    roles
  ) {
    const value = event.detail.option.value
    if (typeof value !== 'string' || !roles.includes(value)) {
      return
    }

    const detail = { role: value}
    this.dispatchEvent(new CustomEvent(eventName, {
      detail,
      bubbles: true,
      composed: true
    }))
  }

  async onCopyLinkClick (event) {
    event.preventDefault()

    if (!this.subjectUri) {
      return
    }

    try {
      await navigator.clipboard.writeText(this.subjectUri)
    } catch (error) {
      debug.error('Failed to copy resource link', error)
    }
  }

  renderAuthenticatedRoleOptions () {
    return ACCESS_ROLES.map(role => html`
      <solid-ui-combobox-option value=${role}>${role}</solid-ui-combobox-option>
    `)
  }

  renderPublicRoleOptions () {
    return PUBLIC_ACCESS_ROLES.map(role => html`
      <solid-ui-combobox-option value=${role}>${role}</solid-ui-combobox-option>
    `)
  }

  renderAuthenticatedModeSelector () {
    return html`
      <solid-ui-combobox
        class="access-role-select access-role-select--compact access-role-select--general access-grants-role access-grants-role--editable access-role-select--authenticated"
        .disabled=${this.disabled}
        .value=${this.authenticatedAccessRoleValue}
        @change=${this.onAuthenticatedRoleChange}
      >
        ${this.renderAuthenticatedRoleOptions()}
      </solid-ui-combobox>
    `
  }

  renderPublicModeSelector () {
    return html`
      <solid-ui-combobox
        class="access-role-select access-role-select--compact access-role-select--general access-grants-role access-grants-role--editable access-role-select--public"
        .disabled=${this.disabled}
        .value=${this.publicAccessRoleValue}
        @change=${this.onPublicRoleChange}
      >
        ${this.renderPublicRoleOptions()}
      </solid-ui-combobox>
    `
  }

  renderGeneralAccessIcon () {
    return html`
      <div class="access-grants-general-share-icon">
        <div class="access-grants-general-share-icon-inner">
          <icon-lucide-globe class="access-grants-general-share-icon-image"></icon-lucide-globe>
        </div>
      </div>
    `
  }

  renderGeneralShareRow (options) {
    return html`
      <div class="access-grants-general-share">
        <div class="access-grants-general-share-content">
          ${this.renderGeneralAccessIcon()}
          <div class="access-grants-general-share-text">
            <p class="access-grants-general-share-text-title">${options.title}</p>
            <p class="access-grants-general-share-text-description">${options.description}</p>
          </div>
        </div>
        ${options.variant === 'authenticated'
          ? this.renderAuthenticatedModeSelector()
          : this.renderPublicModeSelector()}
      </div>
    `
  }

  render () {
    return html`
      <section class="access-grants-general" aria-labelledby="general-access-heading">
        <div class="access-grants-general-header">
          <h2 id="general-access-heading">General Access</h2>
          <solid-ui-button
            class="access-grants-copy-link-button"
            variant="tertiary"
            @click=${this.onCopyLinkClick}
          >
            <icon-lucide-link slot="left-icon"></icon-lucide-link>
            <span class="access-grants-copy-link-button-label">Copy Link</span>
          </solid-ui-button>
        </div>
        ${this.renderGeneralShareRow({
          title: 'Only logged in users with the link',
          description: 'Users must sign in to SolidOS to access this shared item using the link.',
          variant: 'authenticated'
        })}
        ${this.renderGeneralShareRow({
          title: 'Anyone with the Link',
          description: 'Anyone on the internet with the link can view.',
          variant: 'public'
        })}
      </section>
    `
  }
}

if (!customElements.get('solid-ui-access-control-general-access')) customElements.define('solid-ui-access-control-general-access', AccessControlGeneralAccess)
