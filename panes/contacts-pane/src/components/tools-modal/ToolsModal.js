import { loadSheet } from '../../loadSheet.js'

import { html } from 'lit'
import { customElement, DialogComponent } from 'solid-ui'

import '../tools/index.js'

import 'solid-ui/components/dialog-content'
import 'solid-ui/components/dialog'

const styles = await loadSheet(new URL('./ToolsModal.styles.css', import.meta.url))

/**
 * The address book's maintenance tools, in a dialog. The dialog is mounted
 * outside the address book, so group changes are reported through
 * `onGroupsChanged` rather than a bubbling event.
 */
export default class ToolsModal extends DialogComponent {
  static properties = {
    book: { attribute: false },
    selectedGroups: { attribute: false },
    onGroupsChanged: { attribute: false },
  }

  constructor () {
    super()
    this.book = null
    this.selectedGroups = {}
    this.onGroupsChanged = () => {}
  }

  static styles = styles

  ;

  ;

  /** Called when a routine changed the book's groups, so the bar can refresh. */
  ;

  render () {
    return html`
      <solid-ui-dialog title="Tools">
        <solid-ui-dialog-content>
          <contacts-pane-tools
            .book=${this.book}
            .selectedGroups=${this.selectedGroups}
            @groups-changed=${() => this.onGroupsChanged()}
          ></contacts-pane-tools>
        </solid-ui-dialog-content>
      </solid-ui-dialog>
    `
  }
}

if (!customElements.get('contacts-pane-tools-modal')) customElements.define('contacts-pane-tools-modal', ToolsModal)
