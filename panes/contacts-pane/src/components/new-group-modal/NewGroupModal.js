import { loadSheet } from '../../loadSheet.js'

import { html, nothing } from 'lit'
import { customElement, DialogComponent } from 'solid-ui'

import { saveNewGroup } from '../../contactLogic.js'

import 'solid-ui/components/dialog-content'
import 'solid-ui/components/dialog-footer'
import 'solid-ui/components/dialog'
import 'solid-ui/components/input'
import 'solid-ui/components/button'

const styles = await loadSheet(new URL('./NewGroupModal.styles.css', import.meta.url))

export default class NewGroupModal extends DialogComponent {
  static properties = {
    book: {},
    name: { state: true },
    loading: { state: true },
    error: { state: true },
  }

  constructor () {
    super()
    this.book = null
    this.name = ''
    this.loading = false
    this.error = null
  }

  static styles = styles

  ;

  ;

  ;

  ;

  render () {
    if (!this.book) {
      throw new Error('Book is required for <contacts-pane-new-group-modal>')
    }

    return html`
      <solid-ui-dialog title="New Group">
        <form @submit=${this.onSubmit}>
          <solid-ui-dialog-content>
            <solid-ui-input
              required
              name="name"
              label="Group name"
              .value=${this.name}
              @input=${this.onNameChanged}
            ></solid-ui-input>
            ${this.error ? html`<p class="error">${this.error}</p>` : nothing}
          </solid-ui-dialog-content>
          <solid-ui-dialog-footer>
            <solid-ui-button type="submit" ?loading=${this.loading}>Create Group</solid-ui-button>
          </solid-ui-dialog-footer>
        </form>
      </solid-ui-dialog>
    `
  }

  onNameChanged (e) {
    const { value } = e.target

    this.name = typeof value === 'string' ? value : ''
  }

  async onSubmit (e) {
    e.preventDefault()

    this.error = null
    this.loading = true

    try {
      if (!this.book) {
        throw new Error('Book is required for <contacts-pane-new-group-modal>')
      }
      const group = await saveNewGroup(this.book, this.name)

      this.close(group)
    } catch (err) {
      console.error(err)

      this.error = 'Error saving group. If it persists, contact your admin.'
    } finally {
      this.loading = false
    }
  }
}

if (!customElements.get('contacts-pane-new-group-modal')) customElements.define('contacts-pane-new-group-modal', NewGroupModal)
