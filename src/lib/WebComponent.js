import { html, LitElement } from 'lit'
import { loadSheet } from './css.js'

const styles = await loadSheet(new URL('./WebComponent.styles.css', import.meta.url))

export default class WebComponent extends LitElement {
  /** @type {Record<string, (el: WebComponent) => unknown> | undefined} */
  static states

  static finalizeStyles (componentStyles) {
    return [styles, ...super.finalizeStyles(componentStyles)]
  }

  constructor () {
    super()

    /** @type {ElementInternals | undefined} */
    this.internals = undefined
    /** @type {[string, EventListener][]} */
    this.globalListeners = []
    this.traits = []
  }

  disconnectedCallback () {
    super.disconnectedCallback()

    for (const [type, listener] of this.globalListeners) {
      window.removeEventListener(type, listener)
    }

    this.globalListeners = []
  }

  addTrait (trait) {
    this.traits.push(trait)

    return trait
  }

  firstUpdated () {
    this.forwardMethodCall('firstUpdated')
  }

  updated (changedProperties) {
    this.forwardMethodCall('updated', changedProperties)
  }

  formResetCallback () {
    this.forwardMethodCall('formResetCallback')
  }

  willUpdate (changedProperties) {
    super.willUpdate(changedProperties)

    const states = this.constructor.states

    if (!states) return

    for (const [state, condition] of Object.entries(states)) {
      // FIXME when browser support is good enough, use the internals API instead with :state() selectors
      this.toggleAttribute(`data-state-${state}`, !!condition(this))
    }
  }

  addGlobalEventListener (type, listener) {
    this.globalListeners.push([type, listener])

    window.addEventListener(type, listener)
  }

  render () {
    return html`<slot></slot>`
  }

  getInternals () {
    this.internals ??= this.attachInternals()

    return this.internals
  }

  forwardMethodCall (method, ...args) {
    for (const trait of this.traits) {
      trait[method]?.(...args)
    }
  }
}
