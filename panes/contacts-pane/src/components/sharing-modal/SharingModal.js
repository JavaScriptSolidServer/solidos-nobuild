import { loadSheet } from '../../loadSheet.js'
import { html } from 'lit'
import { customElement, DialogComponent } from 'solid-ui'

import 'solid-ui/components/dialog-content'
import 'solid-ui/components/dialog'

const styles = await loadSheet(new URL('./SharingModal.styles.css', import.meta.url))

/**
 * The address book's sharing controls, in a dialog.
 *
 * solid-ui builds the ACL editor imperatively and it is styled by the page's
 * own stylesheets, so the nodes are kept in the light DOM and slotted in
 * rather than rendered into the shadow root, where those rules could not
 * reach them.
 */
export default class SharingModal extends DialogComponent {
  static properties = {
    content: { attribute: false },
  }

  constructor () {
    super()
    this.content = null
  }

  static styles = styles

  /** The controls to show, built by the caller. */
  ;

  connectedCallback () {
    super.connectedCallback()

    if (this.content && this.content.parentNode !== this) {
      this.appendChild(this.content)
    }
  }

  render () {
    return html`
      <solid-ui-dialog title="Sharing">
        <solid-ui-dialog-content>
          <slot></slot>
        </solid-ui-dialog-content>
      </solid-ui-dialog>
    `
  }
}

if (!customElements.get('contacts-pane-sharing-modal')) customElements.define('contacts-pane-sharing-modal', SharingModal)
