import { html } from 'lit'
import WebComponent from '../../lib/WebComponent.js'
import { define } from '../../lib/define.js'
import { loadSheet } from '../../lib/css.js'
import { consumeAuth } from '../../lib/auth/context.js'
import '../../lib/icons.js'

const styles = await loadSheet(new URL('./Avatar.styles.css', import.meta.url))

export default class Avatar extends WebComponent {
  static styles = styles
  static states = {
    fallback: (component) => !component.auth.account?.avatarUrl,
  }

  constructor () {
    super()

    consumeAuth(this)
    this.unsubscribeSessionUpdated = undefined
  }

  connectedCallback () {
    super.connectedCallback()

    this.auth.loadProfile?.()

    this.unsubscribeSessionUpdated = this.auth.onSessionUpdated(() => {
      this.auth.loadProfile?.()
      this.requestUpdate()
    })
  }

  disconnectedCallback () {
    super.disconnectedCallback()

    this.unsubscribeSessionUpdated?.()
  }

  render () {
    if (!this.auth.account?.avatarUrl) {
      return html`
          <icon-lucide-circle-user></icon-lucide-circle-user>
      `
    }

    return html`
        <img src="${this.auth.account?.avatarUrl}" alt="" />
    `
  }
}

define('solid-ui-avatar', Avatar)
