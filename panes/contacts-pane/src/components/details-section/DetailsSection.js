import { html } from 'lit'
import { customElement, WebComponent } from 'solid-ui'

import '../../icons.js'

/**
 * The right-hand details column: one place that knows whether it is hidden,
 * loading, showing a contact, a tool, or a message -- instead of every caller
 * poking at innerHTML, aria-busy, and the `hidden` class themselves.
 *
 * Renders into the light DOM: what it hosts (a rendered pane, solid-ui's ACL
 * box, the Tools view) is legacy DOM styled by the pane's global stylesheet,
 * which a shadow root would cut off. The `detailSection` and
 * `detailsSectionContent` class names stay for the same reason.
 */
export default class DetailsSection extends WebComponent {
  static properties = {
    view: { state: true },
    message: { state: true },
    content: { state: true },
    wide: { state: true },
    notices: { state: true },
  }

  constructor () {
    super()
    this.view = 'empty'
    this.message = ''
    this.content = null
    this.wide = true
    this.notices = []
  }

  ;

  ;

  ;

  /** Starts wide: the empty state holds the width a contact will need. */
  ;

  /** Extra elements shown above the view, e.g. the data-model cleanup
   * prompt. Like content once appended imperatively, they last until the next
   * view change. */
  ;

  /** What kind of thing the content is; 'contact' survives a group change. */
  contentKind = null

  /** The section hosts legacy DOM styled by the pane's stylesheet. */
  createRenderRoot () {
    return this
  }

  connectedCallback () {
    super.connectedCallback()

    this.classList.add('detailSection')
    this.setAttribute('role', 'region')
    this.setAttribute('aria-label', 'Details section')
  }

  get hasContact () {
    return this.contentKind === 'contact'
  }

  showLoading ({ wide = false } = {}) {
    this.transition('loading', { wide })
  }

  showMessage (message) {
    this.transition('message')
    this.message = message
  }

  showError (message) {
    this.transition('error')
    this.message = message
  }

  showContent (content, { wide = false, kind = 'other'} = {}) {
    this.transition('content', { wide })
    this.content = content
    this.contentKind = kind
  }

  /** Back to the empty state -- wide, so the column keeps the width a
   * contact would give it instead of jumping when one is picked. */
  clear () {
    this.transition('empty', { wide: true })
  }

  /** Show an extra element above the current view. It does not open the
   * section -- a notice added while hidden waits for whatever opens it -- and
   * the next view change sweeps it away. */
  addNotice (notice) {
    this.notices = [...this.notices, notice]
  }

  /** A new group selection keeps a contact on screen but sweeps anything
   * else -- tools, messages, a group's sharing pane -- off it. */
  clearUnlessContact () {
    if (this.hasContact) return

    this.clear()
  }

  transition (view, { wide = false } = {}) {
    this.view = view
    this.wide = wide
    this.message = ''
    this.content = null
    this.contentKind = null
    this.notices = []
  }

  render () {
    return html`
      <div
        class="detailsSectionContent ${this.wide ? 'detailsSectionContent--wide' : ''}"
        role="region"
        aria-label="Details"
        aria-live="polite"
        aria-busy=${this.view === 'loading' ? 'true' : 'false'}
      >
        ${this.notices}
        ${this.renderView()}
      </div>
    `
  }

  renderView () {
    switch (this.view) {
      case 'loading':
        return html`Loading...`
      case 'message':
        return html`${this.message}`
      case 'error':
        return html`<div class="detailsError" role="alert">${this.message}</div>`
      case 'content':
        return this.content
      default:
        return this.renderEmpty()
    }
  }

  renderEmpty () {
    return html`
      <div class="detailsEmpty">
        <span class="detailsEmptyIcon" aria-hidden="true">
          <icon-lucide-book-user></icon-lucide-book-user>
        </span>
        <h3 class="detailsEmptyTitle">No contact selected</h3>
        <p class="detailsEmptyText">Select a contact from the list to view their profile, edit details, or send a message.</p>
      </div>
    `
  }
}

if (!customElements.get('contacts-pane-details')) customElements.define('contacts-pane-details', DetailsSection)
