import { html, nothing } from 'lit'
import WebComponent from '../../lib/WebComponent.js'
import { define } from '../../lib/define.js'
import { loadSheet } from '../../lib/css.js'
import { consumeAuth } from '../../lib/auth/context.js'
import '../../lib/icons.js'
import '../avatar/Avatar.js'
import '../button/Button.js'
import '../menu/Menu.js'
import '../menu-item/MenuItem.js'
import '../auth-buttons.js'

const styles = await loadSheet(new URL('./Account.styles.css', import.meta.url))

/**
 * @typedef {object} AccountMenuItem
 * @property {string | import('lit').TemplateResult} label
 * @property {string} [href]
 * @property {boolean} [selected]
 * @property {() => void} [onSelected]
 */

export default class Account extends WebComponent {
  static styles = styles
  static states = {
    initializing: (component) => !component.auth.initialized,
    loggedIn: (component) => !!component.auth.account,
  }

  static properties = {
    menuItems: { type: Array },
  }

  constructor () {
    super()

    consumeAuth(this)
    /** @type {AccountMenuItem[]} */
    this.menuItems = []
    this.unsubscribeSessionUpdated = undefined
  }

  connectedCallback () {
    super.connectedCallback()

    this.unsubscribeSessionUpdated = this.auth.onSessionUpdated(() => this.requestUpdate())
  }

  disconnectedCallback () {
    super.disconnectedCallback()

    this.unsubscribeSessionUpdated?.()
  }

  render () {
    if (!this.auth.initialized) {
      return html`
        <icon-svg-spinners-180-ring></icon-svg-spinners-180-ring>
      `
    }

    if (!this.auth.account) {
      return html`
        <solid-ui-login-button>
            <solid-ui-button slot="trigger">
                <icon-lucide-user slot="left-icon"></icon-lucide-user>
                Log In
            </solid-ui-button>
        </solid-ui-login-button>
        <solid-ui-signup-button>
            <solid-ui-button slot="trigger" variant="outline">
                <icon-lucide-log-in slot="left-icon"></icon-lucide-log-in>
                Sign Up
            </solid-ui-button>
        </solid-ui-signup-button>
      `
    }

    return html`
        <solid-ui-menu placement="bottom-end">
            <button type="button" slot="trigger">
                <solid-ui-avatar></solid-ui-avatar>
                <icon-lucide-chevron-down slot="right-icon"></icon-lucide-chevron-down>
            </button>

            ${this.menuItems.map(menuItem => html`
                <solid-ui-menu-item .href=${menuItem.href ?? nothing} ?selected=${menuItem.selected} @solid-ui-select=${() => menuItem.onSelected?.()}>
                    ${menuItem.label}
                </solid-ui-menu-item>
            `)}
            <solid-ui-logout-button>
                <solid-ui-menu-item slot="trigger">
                    <icon-lucide-log-out slot="left-icon"></icon-lucide-log-out>
                    Sign out
                </solid-ui-menu-item>
            </solid-ui-logout-button>
        </solid-ui-menu>
    `
  }
}

define('solid-ui-account', Account)
