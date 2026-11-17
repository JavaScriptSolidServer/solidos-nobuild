import { html } from 'lit'
import FormControlComponent from '../../lib/FormControlComponent.js'
import { define } from '../../lib/define.js'
import { loadSheet } from '../../lib/css.js'

const styles = await loadSheet(new URL('./Input.styles.css', import.meta.url))

export default class Input extends FormControlComponent {
  static styles = styles

  static properties = {
    type: { type: String, reflect: true },
    readonly: { type: Boolean, reflect: true },
  }

  constructor () {
    super()

    this.type = 'text'
    this.readonly = false
  }

  /** Replaces `@query('input')`. */
  get controlElement () {
    return this.renderRoot?.querySelector('input') ?? null
  }

  render () {
    return html`
      ${this.controlTrait.renderLabel()}
      <div class="input-wrapper">
        <slot @slotchange=${this.onLeftIconSlotChange} name="left-icon"></slot>
        <input
          id=${this.controlTrait.controlId}
          type=${this.type}
          name=${this.name}
          placeholder=${this.placeholder}
          ?required=${this.required}
          .value=${this.value}
          ?readonly=${this.readonly}
          @input=${() => this.controlTrait.onInput()}
          @keydown=${this.onKeyDown}
        />
      </div>
    `
  }

  onLeftIconSlotChange (e) {
    const slot = e.target

    this.toggleAttribute('data-has-left-icon', slot.assignedElements().length > 0)
  }

  onKeyDown (e) {
    if (e.key === 'Enter') {
      e.preventDefault()
      this.controlTrait.onSubmit()
    }
  }
}

define('solid-ui-input', Input)
