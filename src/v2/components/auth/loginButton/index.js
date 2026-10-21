import { LoginButton } from './LoginButton.js'

export { LoginButton }

const LOGIN_BUTTON_TAG_NAME = 'solid-ui-login-button'

if (!customElements.get(LOGIN_BUTTON_TAG_NAME)) {
  customElements.define(LOGIN_BUTTON_TAG_NAME, LoginButton)
}
