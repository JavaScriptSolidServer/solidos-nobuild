import { loadSheet } from '../../lib/css.js'
import WebComponent from '../../lib/WebComponent.js'
import { html } from 'lit'
import { ACCESS_ROLES,} from 'solid-logic'
import { findImage } from '../../widgets/index.js'

import { sym } from 'rdflib'

import '../combobox/index.js'
import '../combobox-option/index.js'
import '../../lib/icons.js'

const styles = await loadSheet(new URL('./AccessControlSharedAccess.styles.css', import.meta.url))

export default class AccessControlSharedAccess extends WebComponent {
  static properties = {
    accessGrantViewModels: { attribute: false },
    disabled: { type: Boolean },
    searchValue: { state: true },
  }

  constructor () {
    super()
    this.accessGrantViewModels = []
    this.disabled = false
    this.searchValue = ''
  }

  static styles = styles

  onSearchInput (event) {
    const target = event.currentTarget
    this.searchValue = typeof target?.value === 'string' ? target.value : ''
  }

  onSearchSelect (event) {
    const option = event.detail.option
    if (typeof option.label !== 'string') {
      return
    }

    this.searchValue = option.label
  }

  onAccessGrantRoleChange (id, event) {
    const value = event.detail.option.value
    const accessRole = typeof value === 'string'
      ? ACCESS_ROLES.find(candidate => candidate === value)
      : undefined
    if (!accessRole) {
      return
    }

    const detail = {
      id,
      role: accessRole
    }

    this.dispatchEvent(new CustomEvent('access-grant-role-changed', {
      detail,
      bubbles: true,
      composed: true
    }))
  }

  getFilteredAccessGrants () {
    const query = this.searchValue.trim().toLowerCase()

    return this.accessGrantViewModels.filter(({ subjectLabel, subjects }) => {
      if (!subjects.length) {
        return false
      }

      return !query || subjectLabel.toLowerCase().includes(query)
    })
  }

  renderAccessGrant (entry) {
    return html`
      <li>
        ${this.renderAuthorizationBadge(entry.authorization, entry.subjectLabel)}
        <h3>${entry.subjectLabel}</h3>
        ${this.renderAuthorizationRole(entry.role, entry.id)}
      </li>
    `
  }

  renderAuthorizationBadge (authorization, subjectLabel) {
    const badge = this.getAuthorizationBadge(authorization, subjectLabel)

    return html`
      <div class="access-grants-image access-grants-image--${badge.kind}">
        ${badge.image
          ? html`<img src=${badge.image} alt="" aria-hidden="true" />`
          : badge.kind === 'origin'
            ? html`<icon-lucide-globe aria-hidden="true"></icon-lucide-globe>`
          : html`<span aria-hidden="true">${badge.text}</span>`}
      </div>
    `
  }

  getAuthorizationBadge (
    authorization,
    subjectLabel
  ) {
    const agent = authorization.agent[0]
    if (agent) {
      const image = findImage(sym(agent))
      return {
        kind: 'agent',
        image,
        text: image ? '' : this.getInitials(subjectLabel, 2)
      }
    }

    const agentGroup = authorization.agentGroup[0]
    if (agentGroup) {
      return {
        kind: 'agentGroup',
        text: this.getInitials(subjectLabel, 1)
      }
    }

    const agentClass = authorization.agentClass[0]
    if (agentClass) {
      const image = findImage(sym(agentClass))
      return {
        kind: 'agentClass',
        image,
        text: image ? '' : this.getInitials(subjectLabel, 2)
      }
    }

    if (authorization.origin[0]) {
      return {
        kind: 'origin',
        text: 'O',
        image: ''
      }
    }

    return {
      kind: 'unknown',
      text: '?'
    }
  }

  getInitials (value, maxWords = 2) {
    const parts = value.split(/\s+/).filter(Boolean).slice(0, maxWords)
    const initials = parts.map(part => part[0]).join('')
    return (initials || value.slice(0, maxWords)).toUpperCase()
  }

  renderAuthorizationRole (role, id) {
    return html`
      <solid-ui-combobox
        class="access-role-select access-role-select--compact access-grants-role access-grants-role--editable ${role === 'Owner' ? 'access-grants-role--owner' : ''}"
        .disabled=${this.disabled}
        .value=${role}
        @change=${(event) => this.onAccessGrantRoleChange(id, event)}
      >
        ${this.renderGrantRoleOptions()}
      </solid-ui-combobox>
    `
  }

  renderGrantRoleOptions () {
    return ACCESS_ROLES.map(role => html`
      <solid-ui-combobox-option value=${role}>${role === 'No Access' ? 'Remove' : role}</solid-ui-combobox-option>
    `)
  }

  render () {
    const accessGrants = this.getFilteredAccessGrants()

    return html`
      <section aria-labelledby="access-grants-heading">
        <div class="access-grants-header">
          <h2 id="access-grants-heading">Shared with</h2>
          <solid-ui-combobox
            class="access-grants-search-input"
            label="Search access grants"
            .srOnlyLabel=${true}
            .value=${this.searchValue}
            placeholder="Search"
            @input=${this.onSearchInput}
            @change=${this.onSearchSelect}
          >
            ${this.accessGrantViewModels
              .filter(({ subjects }) => subjects.length > 0)
              .map(({ subjectLabel }) => html`
                <solid-ui-combobox-option .value=${subjectLabel}>
                  ${subjectLabel}
                </solid-ui-combobox-option>
              `)}
          </solid-ui-combobox>
        </div>
        <div class="access-grants-list">
          <ul>
            ${accessGrants.length > 0
              ? accessGrants.map(entry => this.renderAccessGrant(entry))
              : html`<li>No access grants</li>`}
          </ul>
        </div>
      </section>
    `
  }
}

if (!customElements.get('solid-ui-access-control-shared-access')) customElements.define('solid-ui-access-control-shared-access', AccessControlSharedAccess)
