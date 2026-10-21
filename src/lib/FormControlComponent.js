// Upstream FormControlComponent + FormControlTrait.

import { html, nothing } from 'lit'
import WebComponent from './WebComponent.js'
import { generateId } from './timing.js'

/** @typedef {string | File | FormData | null} FormControlValue */

export class FormControlTrait {
  constructor (target, config) {
    this.config = config
    this.controlId = `control-${generateId()}`
    this.labelId = `label-${this.controlId}`
    this.target = target
  }

  firstUpdated () {
    this.config.getInternals().setFormValue(this.target.value ?? '')
    this.updateValidity()
  }

  updated (changedProperties) {
    if (changedProperties.has('value') || changedProperties.has('required')) {
      this.updateValidity()
    }
  }

  formResetCallback () {
    this.target.value = ''
    this.config.getInternals().setFormValue('')
    this.updateValidity()
  }

  renderLabel () {
    return this.target.label
      ? html`<label id="${this.labelId}" for="${this.controlId}">${this.target.label}</label>`
      : nothing
  }

  onInput () {
    this.setValue(this.config.getControlElement()?.value ?? null)
  }

  onSubmit () {
    this.config.getInternals().form?.requestSubmit()
  }

  setValue (value) {
    this.target.value = value
    this.config.getInternals().setFormValue(this.target.value ?? '')
    this.target.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true }))
  }

  updateValidity () {
    const internals = this.config.getInternals()

    if (this.target.required && (this.target.value ?? '') === '') {
      internals.setValidity(
        { valueMissing: true },
        'Please fill out this field.',
        this.config.getControlElement() ?? undefined
      )
    } else {
      internals.setValidity({})
    }
  }
}

export default class FormControlComponent extends WebComponent {
  static formAssociated = true

  static properties = {
    label: { type: String, reflect: true },
    name: { type: String, reflect: true },
    value: {},
    placeholder: { type: String, reflect: true },
    required: { type: Boolean, reflect: true },
    disabled: { type: Boolean, reflect: true },
  }

  constructor () {
    super()

    this.label = ''
    this.name = ''
    /** @type {FormControlValue} */
    this.value = null
    this.placeholder = ''
    this.required = false
    this.disabled = false

    this.controlTrait = this.addTrait(new FormControlTrait(this, {
      getControlElement: () => this.controlElement,
      getInternals: () => this.getInternals(),
    }))
  }

  /** Subclasses return their native input/select. */
  get controlElement () {
    return null
  }
}
