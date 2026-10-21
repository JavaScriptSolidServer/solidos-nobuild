import { html, nothing } from 'lit'
import { getSuggestedIssuers } from 'solid-logic'
import WebComponent from '../../lib/WebComponent.js'
import { define } from '../../lib/define.js'
import { loadSheet } from '../../lib/css.js'
import { consumeAuth } from '../../lib/auth/context.js'
import '../../lib/icons.js'
import '../dialog/Dialog.js'
import '../dialog-parts.js'
import '../button/Button.js'
import '../combobox/Combobox.js'
import '../combobox-option/ComboboxOption.js'

const styles = await loadSheet(new URL('./LoginModal.styles.css', import.meta.url))

export default class LoginModal extends WebComponent {
  static styles = styles

  static properties = {
    issuerUrl: { type: String, reflect: true },
    issuerInputValue: { state: true },
    failed: { state: true },
    submitting: { state: true },
  }

  constructor () {
    super()

    this.issuerUrl = ''
    this.issuerInputValue = ''
    this.failed = false
    this.submitting = false
    consumeAuth(this)
  }

  /** Replaces `@query('solid-ui-dialog')`. */
  get dialog () {
    return this.renderRoot?.querySelector('solid-ui-dialog') ?? null
  }

  connectedCallback () {
    super.connectedCallback()

    this.issuerInputValue =
      (typeof localStorage !== 'undefined' && localStorage.getItem('loginIssuer')) ||
      this.issuerUrl ||
      getSuggestedIssuers()[0]?.uri ||
      ''
  }

  render () {
    const suggestedIssuers = getSuggestedIssuers()

    return html`
        <solid-ui-dialog title="Select an identity provider">
            <form @submit=${this.onSubmit}>
                <solid-ui-dialog-content>
                    <solid-ui-combobox label="Solid Identity Provider" .value=${this.issuerInputValue} @input=${this.onIssuerInputChange}>
                        ${suggestedIssuers.map(issuer => html`<solid-ui-combobox-option value="${issuer.uri}">${issuer.name}</solid-ui-combobox-option>`)}
                    </solid-ui-combobox>
                    ${this.failed ? html`<p class="error-message">Something went wrong</p>` : nothing}
                </solid-ui-dialog-content>
                <solid-ui-dialog-footer>
                    <solid-ui-button
                        variant="secondary"
                        @click="${() => this.dialog?.close()}"
                    >
                        Cancel
                    </solid-ui-button>
                    <solid-ui-button
                        ?disabled=${!this.issuerInputValue || this.submitting}
                        ?loading=${this.submitting}
                        type="submit"
                    >
                        Login
                    </solid-ui-button>
                </solid-ui-dialog-footer>
            </form>
        </solid-ui-dialog>
    `
  }

  onIssuerInputChange (e) {
    this.issuerInputValue = String(e.target.value)
  }

  async onSubmit (e) {
    e.preventDefault()

    this.failed = false

    if (!this.issuerInputValue) return

    this.submitting = true

    try {
      await this.auth.login(this.issuerInputValue)
    } catch (error) {
      console.error(error)
      this.failed = true
    } finally {
      this.submitting = false
    }
  }
}

define('solid-ui-login-modal', LoginModal)
