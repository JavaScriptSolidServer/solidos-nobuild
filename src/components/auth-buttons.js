// solid-ui-login-button, solid-ui-logout-button, solid-ui-signup-button.
// Upstream has three near-identical files; here one factory makes all three.

import { html } from 'lit'
import WebComponent from '../lib/WebComponent.js'
import { define } from '../lib/define.js'
import { consumeAuth } from '../lib/auth/context.js'
import './button/Button.js'

function authButton (tagName, label, action) {
  return define(tagName, class extends WebComponent {
    constructor () {
      super()

      consumeAuth(this)
    }

    render () {
      return html`
        <slot name="trigger" @click=${this.onClick}>
          <solid-ui-button>
              <slot>
                  ${label}
              </slot>
          </solid-ui-button>
        </slot>
      `
    }

    click () {
      this.auth[action]()
    }

    onClick (e) {
      e.preventDefault()
      this.click()
    }
  })
}

export const LoginButton = authButton('solid-ui-login-button', 'Log In', 'login')
export const LogoutButton = authButton('solid-ui-logout-button', 'Log Out', 'logout')
export const SignupButton = authButton('solid-ui-signup-button', 'Sign Up', 'signup')
