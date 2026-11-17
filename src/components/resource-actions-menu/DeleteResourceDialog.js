import { DialogComponent } from '../../lib/dialogs.js'
import { html } from 'lit'

import '../button/index.js'
import '../dialog/index.js'
import '../dialog-content/index.js'
import '../dialog-footer/index.js'

export default class DeleteResourceDialog extends DialogComponent {
  static properties = {
    resourceName: { type: String },
  }

  constructor () {
    super()
    this.resourceName = 'this resource'
  }

  cancel = () => this.close(false)

  confirm = () => this.close(true)

  render () {
    return html`
      <solid-ui-dialog title="Delete resource">
        <solid-ui-dialog-content>
          <p>Are you sure you want to permanently delete ${this.resourceName}?</p>
        </solid-ui-dialog-content>
        <solid-ui-dialog-footer>
          <solid-ui-button variant="secondary" @click=${this.cancel}>
            Go back
          </solid-ui-button>
          <solid-ui-button @click=${this.confirm}>
            Yes
          </solid-ui-button>
        </solid-ui-dialog-footer>
      </solid-ui-dialog>
    `
  }
}

if (!customElements.get('resource-delete-dialog')) customElements.define('resource-delete-dialog', DeleteResourceDialog)
