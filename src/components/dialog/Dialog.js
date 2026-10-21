import { html, nothing } from 'lit'
import WebComponent from '../../lib/WebComponent.js'
import { define } from '../../lib/define.js'
import { loadSheet } from '../../lib/css.js'
import { consumeDialog, DialogTrait } from '../../lib/dialogs.js'
import '../../lib/icons.js'
import '../dialog-parts.js'
import '../button/Button.js'

const styles = await loadSheet(new URL('./Dialog.styles.css', import.meta.url))

export default class Dialog extends WebComponent {
  static styles = styles

  static properties = {
    title: { type: String, reflect: true },
  }

  constructor () {
    super()

    this.title = ''
    consumeDialog(this)
    this.dialogTrait = this.addTrait(new DialogTrait(this, {
      getContext: () => this.dialogContext,
    }))
  }

  /** Replaces `@query('dialog')`. */
  get nativeDialog () {
    return this.renderRoot?.querySelector('dialog') ?? null
  }

  close (data) {
    this.dialogTrait.close(data)
  }

  firstUpdated () {
    if (!this.nativeDialog) return

    if (typeof this.nativeDialog.showModal === 'function') {
      this.nativeDialog.showModal()
    } else if (typeof this.nativeDialog.show === 'function') {
      this.nativeDialog.show()
    } else {
      this.nativeDialog.setAttribute('open', '')
    }

    this.nativeDialog.addEventListener('close', () => this.close())
  }

  render () {
    const header = this.title
      ? html`
        <solid-ui-dialog-header>
            <h1>${this.title}</h1>
            <solid-ui-button variant="ghost" @click=${() => this.close()}>
                <span class="sr-only">Close</span>
                <icon-lucide-x slot="icon"></icon-lucide-x>
            </solid-ui-button>
        </solid-ui-dialog-header>
        `
      : nothing

    return html`
        <dialog>
            <slot name="header">${header}</slot>
            <slot></slot>
            <slot name="footer"></slot>
        </dialog>
    `
  }
}

define('solid-ui-dialog', Dialog)
