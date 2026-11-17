import { loadSheet } from '../../loadSheet.js'
import { html } from 'lit'
import { customElement, DialogComponent } from 'solid-ui'

import 'solid-ui/components/dialog-content'
import 'solid-ui/components/dialog-footer'
import 'solid-ui/components/dialog'
import 'solid-ui/components/button'

const styles = await loadSheet(new URL('./AlertModal.styles.css', import.meta.url))

export default class AlertModal extends DialogComponent {
  static properties = {
    message: {},
    title: {},
  }

  constructor () {
    super()
    this.message = ''
    this.title = 'Information'
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
          <solid-ui-button @click=${this.onConfirm}>OK</solid-ui-button>
        </solid-ui-dialog-footer>
      </solid-ui-dialog>
    `
  }

  onConfirm () {
    this.close(true)
  }
}

if (!customElements.get('contacts-pane-alert-modal')) customElements.define('contacts-pane-alert-modal', AlertModal)
