import { loadSheet } from '../../loadSheet.js'
import { html } from 'lit'
import { customElement, DialogComponent } from 'solid-ui'

import 'solid-ui/components/dialog-content'
import 'solid-ui/components/dialog-footer'
import 'solid-ui/components/dialog'
import 'solid-ui/components/button'

const styles = await loadSheet(new URL('./ConfirmModal.styles.css', import.meta.url))

export default class ConfirmModal extends DialogComponent {
  static properties = {
    message: {},
    title: {},
  }

  constructor () {
    super()
    this.message = ''
    this.title = 'Confirm'
  }

  static styles = styles

  ;

  ;

  render () {
    return html`
      <solid-ui-dialog title=${this.title}>
        <solid-ui-dialog-content>
          <p>${this.message}</p>
        </solid-ui-dialog-content>
        <solid-ui-dialog-footer>
          <solid-ui-button variant="secondary" @click=${this.onCancel}>Cancel</solid-ui-button>
          <solid-ui-button @click=${this.onConfirm}>OK</solid-ui-button>
        </solid-ui-dialog-footer>
      </solid-ui-dialog>
    `
  }

  onCancel () {
    this.close(false)
  }

  onConfirm () {
    this.close(true)
  }
}

if (!customElements.get('contacts-pane-confirm-modal')) customElements.define('contacts-pane-confirm-modal', ConfirmModal)
