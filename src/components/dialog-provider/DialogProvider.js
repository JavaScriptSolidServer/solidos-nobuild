import WebComponent from '../../lib/WebComponent.js'
import { define } from '../../lib/define.js'
import { provide } from '../../lib/context.js'
import { dialogContext } from '../../lib/dialogs.js'

export default class DialogProvider extends WebComponent {
  static properties = {
    dialogId: { type: String, reflect: true },
  }

  constructor () {
    super()

    /** @type {string | undefined} */
    this.dialogId = undefined
    this.provider = provide(this, dialogContext, { id: '' })
  }

  willUpdate (changedProperties) {
    super.willUpdate(changedProperties)

    if (changedProperties.has('dialogId') && this.dialogId) {
      this.provider.setValue({ id: this.dialogId })
    }
  }

  firstUpdated () {
    const slot = this.shadowRoot?.querySelector('slot')

    this.dispatchEvent(new CustomEvent('mounted', { bubbles: true, composed: true, detail: slot?.assignedElements()[0] }))
  }
}

define('solid-ui-dialog-provider', DialogProvider)
