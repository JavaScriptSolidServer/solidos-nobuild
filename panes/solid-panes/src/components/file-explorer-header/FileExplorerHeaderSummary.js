import { loadSheet } from '../../loadSheet.js'
import { ContextConsumer } from '@lit/context'
import { sym } from 'rdflib'
import { widgets, utils, WebComponent, fileExplorerContext,} from 'solid-ui'
import 'solid-ui/components/button'
import { html } from 'lit'
import { consume } from '@lit/context'
// (type-only import removed: PaneIcon from './types.js')
import '../../icons.js'
const styles = await loadSheet(new URL('./FileExplorerHeaderSummary.styles.css', import.meta.url))
import { getContainerItemCount, isContainerSubject } from '../../utils/podUtils.js'

export default class FileExplorerHeaderSummary extends WebComponent {
  static properties = {
    paneIcon: { attribute: false },
    onBackClick: { attribute: false },
    responseMetadata: { attribute: false },
    resolvedPaneIcon: { state: true },
  }

  constructor () {
    super()
    this.fileExplorerContext = undefined
    new ContextConsumer(this, { ...{ context: fileExplorerContext, subscribe: true }, callback: (value) => { this.fileExplorerContext = value } })
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
  _resolvedPaneIconFor
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

  updated () {
    if (this.paneIcon !== undefined && this._resolvedPaneIconFor !== this.paneIcon) {
      this._resolvedPaneIconFor = this.paneIcon
      this.resolvePaneIcon()
    }

    if (!this.titleHeading || !this.fileExplorerContext?.subjectUri || this._draggableSubjectUri === this.fileExplorerContext.subjectUri) return

    widgets.makeDraggable(this.titleHeading, sym(this.fileExplorerContext.subjectUri)) // doing it this way for now, just to keep the same functionality
    this._draggableSubjectUri = this.fileExplorerContext.subjectUri
  }

  // Needed because humanReadable pane can return a promise for an icon.
  async resolvePaneIcon () {
    try {
      if (this.paneIcon == null) {
        this.resolvedPaneIcon = undefined
        return
      }

      const icon = await this.paneIcon
      this.resolvedPaneIcon = icon ?? undefined
    } catch (error) {
      this.resolvedPaneIcon = undefined
      console.warn('file-explorer-header-summary: failed to resolve pane icon', error)
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
            ? html`<span class="public"><icon-lucide-globe></icon-lucide-globe></span>`
            : html`<span class="private"><icon-lucide-lock-keyhole></icon-lucide-lock-keyhole></span>`}
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
        <solid-ui-button
          variant="ghost"
          @click=${this.onBackClick}
          title="Back"
        >
          <icon-lucide-arrow-left></icon-lucide-arrow-left>
        </solid-ui-button>
        <span class="pane-icon">
          ${this.resolvedPaneIcon ? html`<img src=${this.resolvedPaneIcon} alt="" />` : ''}
        </span>
        ${isContainerResource ? this.renderContainerResourceHeader(label, isPublic) : this.renderResourceHeader(label, isPublic)}
      </div>
      </div>
    `
  }
}

if (!customElements.get('file-explorer-header-summary')) customElements.define('file-explorer-header-summary', FileExplorerHeaderSummary)
