import { html } from 'lit'
import WebComponent from '../../lib/WebComponent.js'
import { define } from '../../lib/define.js'
import { loadSheet } from '../../lib/css.js'
import 'webawesome/components/dropdown/dropdown.js'
import 'webawesome/components/dropdown-item/dropdown-item.js'

const styles = await loadSheet(new URL('./Menu.styles.css', import.meta.url))

export default class Menu extends WebComponent {
  static styles = styles

  static properties = {
    placement: { type: String, reflect: true },
    distance: { type: Number, reflect: true },
    items: { state: true },
  }

  constructor () {
    super()

    this.placement = 'bottom-start'
    this.distance = 5
    /** @type {{ slot: string }[]} */
    this.items = []
    this.observer = new MutationObserver(() => this.syncItems())
  }

  /** Replaces `@query('wa-dropdown')`. */
  get dropdown () {
    return this.renderRoot?.querySelector('wa-dropdown') ?? null
  }

  connectedCallback () {
    super.connectedCallback()

    this.syncItems()
    this.observer.observe(this, { childList: true })
  }

  disconnectedCallback () {
    super.disconnectedCallback()

    this.observer.disconnect()
  }

  render () {
    return html`
      <wa-dropdown
        placement=${this.placement}
        distance=${this.distance}
        @wa-select=${this.onWaSelect}
      >
        <slot name="trigger" slot="trigger"></slot>
        ${this.items.map(
          (item) =>
            html`<wa-dropdown-item @click=${this.onItemClick}>
                <slot name=${item.slot}></slot>
            </wa-dropdown-item>`
        )}
      </wa-dropdown>
    `
  }

  syncItems () {
    // Exclude only the trigger element; include all other children
    // regardless of whether they already have a slot assigned.
    const items = Array.from(this.children).filter(
      (child) => child.getAttribute('slot') !== 'trigger'
    )

    this.items = items.map((item, index) => {
      const slotName = `menu-item-${index}`

      if (item.getAttribute('slot') !== slotName) {
        item.setAttribute('slot', slotName)
      }

      return { slot: slotName }
    })
  }

  onItemClick (event) {
    const waItem = event.currentTarget

    event.stopPropagation()

    if (waItem.disabled) return

    const selectedEvent = this.dispatchSelectEvent(waItem)

    if (selectedEvent.defaultPrevented || !this.dropdown) return

    this.dropdown.open = false
  }

  onWaSelect (event) {
    const selectedEvent = this.dispatchSelectEvent(event.detail.item)

    if (selectedEvent.defaultPrevented) {
      event.preventDefault()

      return
    }

    const slotName = event.detail.item.children[0].getAttribute('name')
    const item = this.querySelector(`[slot="${slotName}"]`)

    item?.click?.()
  }

  dispatchSelectEvent (waItem) {
    const slotName = waItem.children[0].getAttribute('name')
    const item = this.querySelector(`[slot="${slotName}"]`)
    const event = new CustomEvent('solid-ui-select', {
      bubbles: true,
      composed: true,
      cancelable: true,
    })

    item?.dispatchEvent(event)

    return event
  }
}

define('solid-ui-menu', Menu)
