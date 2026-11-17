import { loadSheet } from '../../loadSheet.js'
import { html, nothing } from 'lit'

import { customElement, WebComponent } from 'solid-ui'

import { confirmDialog } from '../../localUtils.js'
import * as toolsLogic from '../../toolsLogic.js'
import * as debug from '../../debug.js'

import 'solid-ui/components/button'

const styles = await loadSheet(new URL('./Tools.styles.css', import.meta.url))

/** The maintenance routines, in the order their buttons appear. */
const ACTIONS = [
  {
    id: 'load-index',
    label: 'Load main index',
    run: (tools, book) => toolsLogic.loadMainIndex(book, tools.log)
  },
  {
    id: 'stats',
    label: 'Statistics',
    run: (tools, book) => toolsLogic.showStats(book, tools.selectedGroups, tools.log)
  },
  {
    id: 'check-access',
    label: 'Check individual contact access of selected groups',
    run: tools => toolsLogic.checkAccess(tools.selectedGroups, tools.log)
  },
  {
    id: 'find-duplicates',
    label: 'Find duplicate contacts',
    run: (tools, book) => toolsLogic.findDuplicates(book, tools.log, confirmDialog)
  },
  {
    id: 'find-groupless',
    label: 'Find contacts with no group',
    run: async (tools, book) => {
      await toolsLogic.findGroupless(book, tools.log)
      tools.log('Groupless list finished.')
    }
  },
  {
    id: 'fix-groupless',
    label: 'Put all individuals with no group in a new group',
    run: async (tools, book) => {
      const changed = await toolsLogic.fixGroupless(book, tools.log, confirmDialog)
      if (changed) {
        tools.dispatchEvent(new CustomEvent('groups-changed', { bubbles: true, composed: true }))
      }
    }
  }
]

/**
 * The Tools view of an address book: maintenance routines and the running log
 * of whichever one was picked. The routines themselves live in toolsLogic; the
 * component owns their buttons and the log they write to.
 */
export default class Tools extends WebComponent {
  static properties = {
    book: { attribute: false },
    selectedGroups: { attribute: false },
    logLines: { state: true },
    activeAction: { state: true },
    runningAction: { state: true },
    failed: { state: true },
  }

  constructor () {
    super()
    this.book = null
    this.selectedGroups = {}
    this.logLines = []
    this.activeAction = null
    this.runningAction = null
    this.failed = false
  }

  static styles = styles

  ;

  ;

  ;

  /** The routine whose output the log currently shows. */
  ;

  /** The routine that is still working, if any. */
  ;

  ;

  /** Bound once so the logic module can be handed a bare function. */
  log = (message) => {
    this.logLines = [...this.logLines, message]
  }

  render () {
    return html`
      <div class="buttons">
        ${ACTIONS.map(action => this.renderAction(action))}
      </div>
      <div class="statsLog" ?hidden=${this.logLines.length === 0}>
        <pre aria-live="polite">${this.logLines.join('\n')}</pre>
      </div>
    `
  }

  renderAction (action) {
    const active = this.activeAction === action.id

    return html`
      <solid-ui-button
        variant=${active && !this.failed ? 'primary' : 'secondary'}
        ?loading=${this.runningAction === action.id}
        ?disabled=${this.runningAction !== null && this.runningAction !== action.id}
        @click=${() => this.onAction(action)}
      >${action.label}</solid-ui-button>
      ${active && this.failed
        ? html`<span class="sr-only" role="alert">${action.label} failed</span>`
        : nothing}
    `
  }

  async onAction (action) {
    if (this.runningAction || !this.book) return

    this.activeAction = action.id
    this.runningAction = action.id
    this.failed = false
    this.logLines = []

    try {
      await action.run(this, this.book)
    } catch (err) {
      debug.error('Tools action "' + action.id + '" failed. Stack: ' + err)
      this.failed = true
      this.log('Failed: ' + ((err).message || err) + '. If it persists, contact your admin.')
    } finally {
      this.runningAction = null
    }
  }
}

if (!customElements.get('contacts-pane-tools')) customElements.define('contacts-pane-tools', Tools)
