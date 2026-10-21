import { html, nothing } from 'lit'
import FormControlComponent from '../../lib/FormControlComponent.js'
import { define } from '../../lib/define.js'
import { loadSheet } from '../../lib/css.js'
import { isEmptyValue } from '../../lib/forms.js'
import '../../lib/icons.js'

const styles = await loadSheet(new URL('./Select.styles.css', import.meta.url))

/** @typedef {{ value: unknown, label: string }} SelectOptionData */

export default class Select extends FormControlComponent {
  static styles = styles

  static properties = {
    // Own accessor below; Lit still observes the attribute and converts it.
    options: { type: Array, noAccessor: true },
    _options: { state: true },
  }

  constructor () {
    super()

    /** @type {SelectOptionData[] | null} */
    this._options = null
  }

  set options (value) {
    this._options = value
  }

  /** @returns {SelectOptionData[]} */
  get options () {
    if (this._options) return this._options

    return Array.from(this.querySelectorAll('solid-ui-select-option')).map((option) => ({
      value: option.value,
      label: option.textContent,
    }))
  }

  /** Replaces `@query('select')`. */
  get controlElement () {
    return this.renderRoot?.querySelector('select') ?? null
  }

  render () {
    const defaultOption = this.options.some(option => isEmptyValue(option.value))
      ? nothing
      : html`<option disabled value="" ?selected=${!this.value}>Select an option</option>`

    return html`
      ${this.controlTrait.renderLabel()}
      <div class="input-wrapper">
        <select
          id="${this.controlTrait.controlId}"
          name=${this.name}
          ?required=${this.required}
          @change=${this.onChange}
        >
          ${defaultOption}
          ${this.options.map(
            (option) =>
              html`<option
                .value=${option.value}
                ?selected=${option.value === this.value}
              >
                ${option.label}
              </option>`
          )}
        </select>
        <icon-lucide-chevron-down></icon-lucide-chevron-down>
      </div>
    `
  }

  onChange () {
    const value = this.controlElement?.value ?? null
    const option = this.options.find((option) => option.value === value)

    this.controlTrait.setValue(value)
    this.dispatchEvent(new CustomEvent('change', { bubbles: true, composed: true, detail: { option } }))
  }
}

define('solid-ui-select', Select)
