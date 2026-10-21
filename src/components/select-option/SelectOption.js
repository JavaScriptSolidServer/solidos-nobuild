import { html, nothing } from 'lit'
import WebComponent from '../../lib/WebComponent.js'
import { define } from '../../lib/define.js'

export default class SelectOption extends WebComponent {
  static properties = {
    value: { type: String, reflect: true },
  }

  constructor () {
    super()

    this.value = ''
  }

  render () {
    return html`${nothing}`
  }
}

define('solid-ui-select-option', SelectOption)
