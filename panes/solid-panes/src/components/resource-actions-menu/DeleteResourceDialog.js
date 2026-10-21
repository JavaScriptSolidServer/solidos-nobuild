import { customElement, DialogComponent } from 'solid-ui'
import { html } from 'lit'

import 'solid-ui/components/button'
import 'solid-ui/components/dialog'
import 'solid-ui/components/dialog-content'
import 'solid-ui/components/dialog-footer'

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
