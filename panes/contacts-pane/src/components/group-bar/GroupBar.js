import { loadSheet } from '../../loadSheet.js'
import { html, nothing } from 'lit'

import { repeat } from 'lit/directives/repeat.js'
import { ref } from 'lit/directives/ref.js'
import { customElement, WebComponent, ns, widgets } from 'solid-ui'
import { store } from 'solid-logic'

import { groupsInOrder, groupMemberCount, handleURIsDroppedOnGroup, refreshNames } from '../../addressBookPresenter.js'
import { groupMembers } from '../../contactLogic.js'

import 'solid-ui/components/button'
import '../../icons.js'
import 'solid-ui/components/input'

const styles = await loadSheet(new URL('./GroupBar.styles.css', import.meta.url))

const kb = store

/** Elements already handed to solid-ui's drag/drop widgets, which attach
 * listeners imperatively and must not be wired twice as Lit re-renders. */
const wired = new WeakSet()

/**
 * The row of group buttons: "All Contacts", every group in the book, and
 * "New Group".
 *
 * `selectedGroups` is shared with the pane -- the people list reads it to work
 * out which contacts to show -- so it is mutated in place rather than replaced.
 * `revision` is what turns those in-place mutations back into a render.
 */
export default class GroupBar extends WebComponent {
  static properties = {
    heading: { attribute: false },
    book: { attribute: false },
    options: { attribute: false },
    selectedGroups: { attribute: false },
    rows: { state: true },
    busy: { state: true },
    error: { state: true },
    revision: { state: true },
    filter: { state: true },
  }

  constructor () {
    super()
    this.heading = null
    this.book = null
    this.options = {}
    this.selectedGroups = {}
    this.rows = []
    this.busy = false
    this.error = null
    this.revision = 0
    this.filter = ''
  }

  static styles = styles

  /** The address book's title, shown as the column's heading. */
  ;

  ;

  ;

  ;

  ;

  ;

  ;

  ;

  /** Narrows the list of group buttons; selections elsewhere are unaffected. */
  ;

  connectedCallback () {
    super.connectedCallback()
    this.refresh()
  }

  /** Re-read the groups from the store. Call after adding or deleting one. */
  refresh () {
    this.rows = groupsInOrder(this.book, this.options).map((group) => {
      const name = kb.any(group, ns.vcard('fn'))

      return {
        group,
        uri: group.uri,
        name: name ? name.value : 'Some group',
        count: groupMemberCount(group)
      }
    })
    this.revision++
  }

  /** Load every group's document and show all of their contacts. */
  async selectAll () {
    this.refresh()
    if (!this.rows.length) return

    this.error = null
    this.busy = true
    const loaded = await Promise.all(this.rows.map(row => this.load(row.group)))
    this.busy = false

    const failed = this.rows.filter((_row, i) => !loaded[i])
    if (failed.length) {
      console.error('Failed to load group documents:', failed.map(row => row.uri))
      this.error = 'Failed to load all groups. If it persists, contact your admin.'
      return
    }

    for (const row of this.rows) this.selectedGroups[row.uri] = true

    this.refresh() // counts are only known once the documents are in
    this.announceSelection()
  }

  /** How many groups the book has, which the header uses to tell "one group
   * is selected" apart from "the only group is selected". */
  get groupCount () {
    return this.rows.length
  }

  get allSelected () {
    return this.rows.length > 0 && this.rows.every(row => this.selectedGroups[row.uri])
  }

  /** How many distinct contacts the loaded groups hold between them, or null
   * before any group document is in -- the same "show nothing rather than a
   * misleading 0" rule the per-group counts follow. */
  get allCount () {
    const seen = new Set()
    let anyLoaded = false
    for (const row of this.rows) {
      if (row.count === null) continue
      anyLoaded = true
      for (const member of groupMembers(kb, row.group)) seen.add(member.uri)
    }
    return anyLoaded ? seen.size : null
  }

  load (group) {
    return new Promise(resolve => {
      kb.fetcher.nowOrWhenFetched(group.doc(), undefined, (ok) => resolve(ok))
    })
  }

  announceSelection () {
    refreshNames(null, null, false)
    this.dispatchEvent(new CustomEvent('selection-changed', { bubbles: true, composed: true }))
  }

  /** Hand a freshly rendered row to solid-ui's drag and drop widgets. */
  wireDragAndDrop (group) {
    return ref((el) => {
      if (!el || wired.has(el)) return

      wired.add(el)
      widgets.makeDraggable(el, group)
      widgets.makeDropTarget(el, (uris) => handleURIsDroppedOnGroup(uris, group))
    })
  }

  get visibleRows () {
    const filter = this.filter.trim().toLowerCase()
    if (filter.length === 0) return this.rows

    return this.rows.filter(row => row.name.toLowerCase().includes(filter))
  }

  onFilterInput (event) {
    this.filter = (event.target).value?.toString() ?? ''
  }

  render () {
    return html`
      <header class="header">
        ${this.heading ? html`<h2 class="heading">${this.heading}</h2>` : nothing}
        <solid-ui-input
          class="groupFilter"
          type="search"
          aria-label="Filter groups"
          placeholder="Filter groups"
          .value=${this.filter}
          @input=${this.onFilterInput}
        ></solid-ui-input>
      </header>

      <button
        type="button"
        class="allGroupsButton ${this.allSelected ? 'allGroupsButton--active' : ''}"
        aria-label=${this.allCount === null
          ? 'All Contacts'
          : `All Contacts, ${this.allCount} ${this.allCount === 1 ? 'contact' : 'contacts'}`}
        aria-pressed=${this.allSelected ? 'true' : 'false'}
        aria-busy=${this.busy ? 'true' : 'false'}
        @click=${this.onAllGroups}
      >
        <span class="groupName">All Contacts</span>
        ${this.allCount === null
          ? nothing
          : html`<span class="groupCount" aria-hidden="true">${this.allCount}</span>`}
      </button>

      <ul class="groupButtonsList" role="list" aria-label="Groups list">
        ${repeat(this.visibleRows, row => row.uri, row => this.renderGroup(row))}
      </ul>

      ${this.error ? html`<p class="error" role="alert">${this.error}</p>` : nothing}

      <div class="newGroup">
        <solid-ui-button variant="secondary" @click=${this.onNewGroup}>
          <icon-lucide-plus slot="left-icon"></icon-lucide-plus>
          New Group
        </solid-ui-button>
      </div>
    `
  }

  renderGroup (row) {
    // While "All Contacts" is on, it carries the selection on behalf of every
    // group -- showing each row as picked as well reads as a second, separate
    // choice. Kept out of aria-pressed too, so both tellings agree.
    const selected = !!this.selectedGroups[row.uri] && !this.allSelected
    const label = row.count === null
      ? row.name
      : `${row.name}, ${row.count} ${row.count === 1 ? 'contact' : 'contacts'}`

    return html`
      <li
        role="listitem"
        aria-label=${label}
        class=${selected ? 'selected' : ''}
        ${this.wireDragAndDrop(row.group)}
      >
        <button
          type="button"
          class="groupButton"
          aria-pressed=${selected ? 'true' : 'false'}
          @click=${(event) => this.onGroup(event, row)}
        >
          <span class="groupName">${row.name}</span>
          ${row.count === null
            ? nothing
            : html`<span class="groupCount" aria-hidden="true">${row.count}</span>`}
        </button>
      </li>
    `
  }

  async onAllGroups () {
    // Selecting everything is a destination, not a toggle: clicking it while
    // it is already on should leave you where you are, not empty the list.
    if (this.allSelected) return

    await this.selectAll()
  }

  async onGroup (event, row) {
    event.preventDefault()
    this.error = null

    // Command-click accumulates; a plain click replaces the selection.
    if (event.metaKey) {
      this.selectedGroups[row.uri] = !this.selectedGroups[row.uri]
    } else {
      for (const key in this.selectedGroups) delete this.selectedGroups[key]
      this.selectedGroups[row.uri] = true
    }

    this.revision++

    const ok = await this.load(row.group)
    if (!ok) {
      console.error('Failed to load group document:', row.uri)
      this.error = `Failed to load "${row.name}". If it persists, contact your admin.`
    }

    this.refresh() // the members, and so the count, are known now
    this.announceSelection()
  }

  onNewGroup () {
    this.dispatchEvent(new CustomEvent('new-group-requested', { bubbles: true, composed: true }))
  }
}

if (!customElements.get('contacts-pane-group-bar')) customElements.define('contacts-pane-group-bar', GroupBar)
