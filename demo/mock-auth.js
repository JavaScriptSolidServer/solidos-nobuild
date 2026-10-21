// Demo only: <demo-auth state="initializing|out|in" avatar="url"> provides a fake
// AuthContext, so every Account state can be seen without a Solid login.
// Log in / Log out flip the state, the way the real provider would.

import { html } from 'lit'
import { ContextProvider } from '@lit/context'
import WebComponent from '../src/lib/WebComponent.js'
import { define } from '../src/lib/define.js'
import { Account, authContext } from '../src/lib/auth/context.js'

class MockAuth {
  constructor (state, avatarUrl) {
    this.state = state
    this.avatarUrl = avatarUrl
    this.listeners = []
  }

  get initialized () { return this.state !== 'initializing' }
  get account () { return this.state === 'in' ? new Account('https://alice.example/profile/card#me', this.avatarUrl) : null }

  set (state) {
    this.state = state
    this.listeners.forEach(listener => listener())
  }

  async login () { this.set('in') }
  async logout () { this.set('out') }
  async signup () { console.log('[demo] signup') }

  onSessionUpdated (callback) {
    this.listeners.push(callback)

    return () => { this.listeners = this.listeners.filter(l => l !== callback) }
  }
}

define('demo-auth', class extends WebComponent {
  constructor () {
    super()

    this.provider = new ContextProvider(this, { context: authContext })
  }

  connectedCallback () {
    this.provider.setValue(new MockAuth(this.getAttribute('state') ?? 'out', this.getAttribute('avatar') ?? undefined))
    super.connectedCallback()
  }

  render () {
    return html`<slot></slot>`
  }
})
