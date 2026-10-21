import { html } from 'lit'
import WebComponent from '../../lib/WebComponent.js'
import { define } from '../../lib/define.js'
import { loadSheet } from '../../lib/css.js'

const styles = await loadSheet(new URL('./MenuItem.styles.css', import.meta.url))

export default class MenuItem extends WebComponent {
  static styles = styles

  static properties = {
    href: { type: String, reflect: true },
    selected: { type: Boolean, reflect: true },
  }

  constructor () {
    super()

    /** @type {string | undefined} */
    this.href = undefined
    this.selected = false
  }

  /** Replaces `@query('a')`. */
  get anchor () {
    return this.renderRoot?.querySelector('a') ?? null
  }

  render () {
    if (this.href) {
      return html`
        <a href="${this.href}" target="_blank" rel="noopener noreferrer" ?data-selected=${this.selected}>
            <slot name="left-icon"></slot>
            <slot></slot>
            <slot name="right-icon"></slot>
        </a>
      `
    }

    return html`
        <div ?data-selected=${this.selected}>
            <slot name="left-icon"></slot>
            <slot></slot>
            <slot name="right-icon"></slot>
        </div>
    `
  }

  click () {
    this.anchor?.click()
  }
}

define('solid-ui-menu-item', MenuItem)
