import { loadSheet } from '../../loadSheet.js'
import { ContextConsumer } from '@lit/context'
import { html, nothing } from 'lit'
import { consume } from '@lit/context'
import { customElement, WebComponent, ns, DialogTrait, dialogContext, DEFAULT_DIALOG_CONTEXT } from 'solid-ui'

import { saveNewContact } from '../../contactLogic.js'

import 'solid-ui/components/dialog-content'
import 'solid-ui/components/dialog-footer'
import 'solid-ui/components/dialog'
import 'solid-ui/components/input'
import 'solid-ui/components/select-option'
import 'solid-ui/components/select'

const styles = await loadSheet(new URL('./AddContactModal.styles.css', import.meta.url))

const CONTACT_TYPES = [
  { value: 'person', label: 'Person' },
  { value: 'organization', label: 'Organization' },
]

export default class AddContactModal extends WebComponent {
  static properties = {
    book: {},
    selectedGroups: {},
    contactType: { state: true },
    name: { state: true },
    loading: { state: true },
    error: { state: true },
  }

  static styles = styles

  ;

  ;

  ;

  ;

  ;

  ;

  ;

  dialogTrait

  constructor () {
    super()
    this.book = null
    this.selectedGroups = null
    this.contactType = 'organization'
    this.name = ''
    this.loading = false
    this.error = null
    this.context = DEFAULT_DIALOG_CONTEXT
    new ContextConsumer(this, { ...{ context: dialogContext, subscribe: true }, callback: (value) => { this.context = value } })

    this.dialogTrait = this.addTrait(new DialogTrait(this, {
      getContext: () => this.context,
    }))
  }

  render () {
    if (!this.book || !this.selectedGroups) {
      throw new Error('Book and selectedGroups are required for <solid-contacts-pane-add-contact-modal>')
    }

    return html`
      <solid-ui-dialog title="Add Contact">
        <form @submit=${this.onSubmit}>
          <solid-ui-dialog-content>
            <p>The new contact is added to the already selected group.</p>
            <solid-ui-select
              name="type"
              label="Contact type"
              .value=${this.contactType}
              @input=${this.onContactTypeChanged}
            >
              ${CONTACT_TYPES.map(
                (type) =>
                  html`<solid-ui-select-option .value=${type.value}
                    >${type.label}</solid-ui-select-option
                  >`
              )}
            </solid-ui-select>
            <solid-ui-input
              required
              name="name"
              label=${this.contactType === 'person'
                ? 'Individual name'
                : 'Organization name'}
              .value=${this.name}
              @input=${this.onNameChanged}
            ></solid-ui-input>
            ${this.error ? html`<p class="error">${this.error}</p>` : nothing}
          </solid-ui-dialog-content>
          <solid-ui-dialog-footer>
            <solid-ui-button type="submit" ?loading=${this.loading}>Add Contact</solid-ui-button>
          </solid-ui-dialog-footer>
        </form>
      </solid-ui-dialog>
    `
  }

  onContactTypeChanged (e) {
    this.contactType = (e.target).value
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
      const person = await saveNewContact(
        this.book,
        this.name,
        this.selectedGroups,
        this.contactType === 'organization'
          ? ns.vcard('Organization')
          : ns.vcard('Individual')
      )

      this.dialogTrait.close(person)
    } catch (err) {
      console.error(err)

      this.error = 'Error saving contact. If it persists, contact your admin.'
    } finally {
      this.loading = false
    }
  }
}

if (!customElements.get('solid-contacts-pane-add-contact-modal')) customElements.define('solid-contacts-pane-add-contact-modal', AddContactModal)
