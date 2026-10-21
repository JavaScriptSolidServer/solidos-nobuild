import { html } from 'lit'
import WebComponent from '../../lib/WebComponent.js'
import { define } from '../../lib/define.js'
import { ShowDialogEvent, CloseDialogEvent } from '../../lib/dialogs.js'
import '../dialog-provider/DialogProvider.js'

export default class DialogsRoot extends WebComponent {
  static properties = {
    dialogs: { state: true },
  }

  constructor () {
    super()

    /** @type {import('../../lib/dialogs.js').Dialog[]} */
    this.dialogs = []
  }

  connectedCallback () {
    super.connectedCallback()

    this.addGlobalEventListener(ShowDialogEvent.eventName, (event) => {
      event.stopImmediatePropagation()

      this.dialogs = [...this.dialogs, event.dialog]
    })

    this.addGlobalEventListener(CloseDialogEvent.eventName, (event) => {
      event.stopImmediatePropagation()

      const dialog = this.dialogs.find(dialog => dialog.id === event.id)

      this.dialogs = this.dialogs.filter(dialog => dialog.id !== event.id)

      dialog?.closed(event.data)
    })
  }

  render () {
    return html`${this.dialogs.map(dialog => html`
        <solid-ui-dialog-provider dialogId="${dialog.id}">
            ${dialog.element}
        </solid-ui-dialog-provider>
    `)}`
  }
}

define('solid-ui-dialogs-root', DialogsRoot)
