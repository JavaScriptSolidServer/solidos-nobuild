import { loadSheet } from '../../loadSheet.js'
import { customElement, WebComponent } from 'solid-ui'
import { html } from 'lit'

import 'solid-ui/components/account'
import 'solid-ui/components/button'
import 'solid-ui/components/menu-item'
import 'solid-ui/components/menu'
import 'solid-ui/components/solid-emblem'
import '../../icons.js'

const styles = await loadSheet(new URL('./Navbar.styles.css', import.meta.url))

export default class Navbar extends WebComponent {
  static properties = {
    navbarItems: { type: Array },
  }

  constructor () {
    super()
    this.navbarItems = []
  }

  static styles = styles

  selectItem (item) {
    this.dispatchEvent(new CustomEvent('solid-ui-select', {
      detail: item,
      bubbles: true,
      composed: true,
      cancelable: true
    }))
  }

  render () {
    return html`
    <nav class="navbar">
       ${this.navbarItems.map(menuItem => html`
        <button
          type="button"
          class=${menuItem.selected ? 'selected' : ''}
          @click=${() => this.selectItem(menuItem)}
          title=${typeof menuItem.label === 'string' ? menuItem.label : ''}
        >
          ${menuItem.label}
        </button>
      `)}
    </nav>
    `
  }
}

if (!customElements.get('solid-panes-navbar')) customElements.define('solid-panes-navbar', Navbar)
