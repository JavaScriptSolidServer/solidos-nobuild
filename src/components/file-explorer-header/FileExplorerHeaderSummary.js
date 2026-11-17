import { loadSheet } from '../../lib/css.js'
import { ContextConsumer } from '@lit/context'
import { sym } from 'rdflib'
import WebComponent from '../../lib/WebComponent.js'
import * as utils from '../../utils/index.js'
import * as widgets from '../../widgets/index.js'
import { DEFAULT_FILE_EXPLORER_CONTEXT, fileExplorerContext } from '../../lib/file-explorer/context.js'
import '../button/index.js'

import { html } from 'lit'
import { consume } from '@lit/context'
// (type-only import removed: PaneIcon from './types.js')
import '../../lib/icons.js'
const styles = await loadSheet(new URL('./FileExplorerHeaderSummary.styles.css', import.meta.url))
import { getContainerItemCount, isContainerSubject } from '../../utils/podUtils.js'

export default class FileExplorerHeaderSummary extends WebComponent {
  static properties = {
    paneIcon: { attribute: false },
    onBackClick: { attribute: false },
    showBack: { type: Boolean },
    responseMetadata: { attribute: false },
    resolvedPaneIcon: { state: true },
  }

  constructor () {
    super()
    this.fileExplorerContext = DEFAULT_FILE_EXPLORER_CONTEXT
    new ContextConsumer(this, { ...{ context: fileExplorerContext, subscribe: true }, callback: (value) => { this.fileExplorerContext = value } })
    this.showBack = true
    this.responseMetadata = {
      modified: undefined,
      isPublic: false
    }
    this.resolvedPaneIcon = undefined
  }

  get titleHeading () {
    return this.renderRoot?.querySelector('h1') ?? null
  }

  static styles = styles

  _draggableSubjectUri
  _paneIconGeneration = 0

  formatModifiedDate (modified) {
    if (!modified) return ''

    const date = new Date(modified)
    if (Number.isNaN(date.getTime())) return modified

    const parts = new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).formatToParts(date)

    const getPart = (type) => parts.find(part => part.type === type)?.value ?? ''
    const day = getPart('day')
    const month = getPart('month')
    const year = getPart('year')
    const hour = getPart('hour')
    const minute = getPart('minute')
    const dayPeriod = getPart('dayPeriod').toUpperCase()

    return `${day} ${month}, ${year} at ${hour}:${minute} ${dayPeriod}`
  }

  willUpdate (changedProperties) {
    if (changedProperties.has('paneIcon')) {
      const generation = ++this._paneIconGeneration
      this.resolvedPaneIcon = undefined
      this.resolvePaneIcon(this.paneIcon, generation)
    }
  }

  updated () {
    if (!this.titleHeading || !this.fileExplorerContext?.subjectUri || this._draggableSubjectUri === this.fileExplorerContext.subjectUri) return

    widgets.makeDraggable(this.titleHeading, sym(this.fileExplorerContext.subjectUri)) // doing it this way for now, just to keep the same functionality
    this._draggableSubjectUri = this.fileExplorerContext.subjectUri
  }

  // Needed because humanReadable pane can return a promise for an icon.
  async resolvePaneIcon (paneIcon, generation) {
    try {
      if (paneIcon == null) return

      const icon = await paneIcon
      if (generation === this._paneIconGeneration) {
        this.resolvedPaneIcon = icon ?? undefined
      }
    } catch (error) {
      if (generation === this._paneIconGeneration) {
        this.resolvedPaneIcon = undefined
        console.warn('file-explorer-header-summary: failed to resolve pane icon', error)
      }
    }
  }

  renderContainerResourceHeader (label, isPublic) {
    const itemCount = getContainerItemCount(this.fileExplorerContext?.store, this.fileExplorerContext?.subjectUri) ?? 0
    return html`
      <div class="container-info">
        <h1>
          <span>${label}</span>
        </h1>
        <p>
        ${itemCount} items
          ${isPublic
            ? html`<span class="public"><icon-lucide-globe aria-hidden="true"></icon-lucide-globe><span class="sr-only">Public</span></span>`
            : html`<span class="private"><icon-lucide-lock-keyhole aria-hidden="true"></icon-lucide-lock-keyhole><span class="sr-only">Private</span></span>`}
        </p>
      </div>
    `
  }

  renderResourceHeader (label, isPublic) {
    const modified = this.formatModifiedDate(this.responseMetadata.modified)

    return html`
        <div class="resource-info">
          <h1>
            <span>${label}</span>
          </h1>
          <p><span class="resource-date">${modified}</span> ${isPublic ? html`<span class="public"><icon-lucide-globe></icon-lucide-globe> Public</span>` : html`<span class="private"><icon-lucide-lock-keyhole></icon-lucide-lock-keyhole> Private</span>`}</p>
        </div>
    `
  }

  render () {
    const subject = this.fileExplorerContext?.subjectUri ? sym(this.fileExplorerContext.subjectUri) : undefined
    const label = subject ? utils.label(subject) : ''
    const isPublic = this.responseMetadata.isPublic
    const isContainerResource = isContainerSubject(this.fileExplorerContext?.store, this.fileExplorerContext?.subjectUri)

    return html`
      <div class="file-explorer-header-summary">
        ${this.showBack
          ? html`
            <solid-ui-button
              variant="ghost"
              @click=${this.onBackClick}
              title="Back"
            >
              <icon-lucide-arrow-left></icon-lucide-arrow-left>
              <span class="sr-only">Back</span>
            </solid-ui-button>
          `
          : ''}
        <span class="pane-icon">
          ${this.resolvedPaneIcon ? html`<img src=${this.resolvedPaneIcon} alt="" />` : ''}
        </span>
        ${isContainerResource ? this.renderContainerResourceHeader(label, isPublic) : this.renderResourceHeader(label, isPublic)}
      </div>
      </div>
    `
  }
}

if (!customElements.get('solid-ui-file-explorer-header-summary')) customElements.define('solid-ui-file-explorer-header-summary', FileExplorerHeaderSummary)
