import { loadSheet } from '../../lib/css.js'
import WebComponent from '../../lib/WebComponent.js'
import { html, nothing } from 'lit'

import '../button/index.js'
import '../../lib/icons.js'

const styles = await loadSheet(new URL('./ErrorState.styles.css', import.meta.url))

export default class ErrorState extends WebComponent {
  static properties = {
    title: { type: String },
    message: { type: String },
  }

  constructor () {
    super()
    this.title = ''
    this.message = ''
  }

  static styles = styles

  render () {
    return html`
      <section role="alert">
        <solid-ui-button class="close-button" variant="ghost" @click=${this.onClose}>
          <icon-lucide-x slot="icon" aria-hidden="true"></icon-lucide-x>
          <span class="sr-only">Close</span>
        </solid-ui-button>
        <div class="icon">
          <icon-lucide-triangle-alert aria-hidden="true"></icon-lucide-triangle-alert>
        </div>
        <div class="content">
          ${this.title ? html`<h2>${this.title}</h2>` : nothing}
          ${this.message ? html`<p>${this.message}</p>` : nothing}
          <slot></slot>
        </div>
      </section>
    `
  }

  onClose () {
    this.dispatchEvent(new CustomEvent('close', {
      bubbles: true,
      composed: true
    }))
  }
}

if (!customElements.get('solid-ui-error-state')) customElements.define('solid-ui-error-state', ErrorState)
