import { html } from 'lit'
import WebComponent from '../../lib/WebComponent.js'
import { define } from '../../lib/define.js'
import { consumeAuth } from '../../lib/auth/context.js'

/** Shows the default slot when logged in, `guest` when not, `initializing` until auth is ready. */
export default class Guard extends WebComponent {
  static states = {
    initializing: (component) => !component.auth.initialized,
    loggedIn: (component) => !!component.auth.account,
  }

  constructor () {
    super()

    consumeAuth(this)
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
        <slot name="initializing"></slot>
      `
    }

    if (!this.auth.account) {
      return html`
        <slot name="guest"></slot>
      `
    }

    return html`
      <slot></slot>
    `
  }
}

define('solid-ui-guard', Guard)
