import { html, nothing } from 'lit'
import WebComponent from '../../lib/WebComponent.js'
import { define } from '../../lib/define.js'
import { loadSheet } from '../../lib/css.js'
import '../../lib/icons.js'

const styles = await loadSheet(new URL('./Button.styles.css', import.meta.url))

export const BUTTON_VARIANTS = /** @type {const} */ (['primary', 'secondary', 'tertiary', 'outline', 'ghost'])

/** @typedef {typeof BUTTON_VARIANTS[number]} ButtonVariant */

export default class Button extends WebComponent {
  static styles = styles
  static formAssociated = true

  static properties = {
    variant: { type: String, reflect: true },
    type: { type: String, reflect: true },
    disabled: { type: Boolean },
    loading: { type: Boolean },
  }

  constructor () {
    super()

    // Defaults go in the constructor, not class fields: fields would shadow Lit's accessors.
    /** @type {ButtonVariant} */
    this.variant = 'primary'
    this.type = 'button'
    /** @type {boolean | undefined} */
    this.disabled = undefined
    this.loading = false
  }

  render () {
    const disabled = this.disabled ?? this.loading

    return html`
        <button type=${this.type} ?disabled=${disabled} @click=${this.onClick}>
            ${this.loading ? html`<icon-svg-spinners-180-ring></icon-svg-spinners-180-ring>` : nothing}
            <slot name="left-icon"></slot>
            <slot @slotchange=${this.onIconSlotChange} name="icon"></slot>
            <slot></slot>
            <slot name="right-icon"></slot>
        </button>
    `
  }

  onIconSlotChange (e) {
    this.toggleAttribute('data-has-icon-slot', e.target.assignedElements().length > 0)
  }

  onClick () {
    switch (this.type) {
      case 'submit':
        this.getInternals().form?.requestSubmit()
        break
      case 'reset':
        this.getInternals().form?.reset()
        break
    }
  }
}

define('solid-ui-button', Button)
