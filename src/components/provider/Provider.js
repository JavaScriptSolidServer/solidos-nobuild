import { html } from 'lit'
import WebComponent from '../../lib/WebComponent.js'
import { define } from '../../lib/define.js'
import { provide } from '../../lib/context.js'
import { authContext } from '../../lib/auth/context.js'
import SolidAuth, { DEFAULT_SIGNUP_URL } from '../../lib/auth/SolidAuth.js'
import '../dialogs-root/DialogsRoot.js'

export default class Provider extends WebComponent {
  static properties = {
    signupUrl: { type: String, reflect: true },
  }

  constructor () {
    super()

    /** @type {string | undefined} */
    this.signupUrl = undefined
    this.auth = new SolidAuth()
    provide(this, authContext, this.auth)
  }

  async connectedCallback () {
    super.connectedCallback()

    await this.auth.initialize()
  }

  willUpdate (changedProperties) {
    super.willUpdate(changedProperties)

    if (changedProperties.has('signupUrl')) {
      this.auth.signupUrl = this.signupUrl ?? DEFAULT_SIGNUP_URL
    }
  }

  render () {
    return html`
        <slot></slot>
        <solid-ui-dialogs-root></solid-ui-dialogs-root>
    `
  }
}

define('solid-ui-provider', Provider)
