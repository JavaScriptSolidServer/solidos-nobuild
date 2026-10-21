import { createContext } from '@lit/context'
import { consume } from '../context.js'

export class Account {
  /**
   * @param {string} webId
   * @param {string} [avatarUrl]
   */
  constructor (webId, avatarUrl) {
    this.webId = webId
    this.avatarUrl = avatarUrl
  }
}

/**
 * @typedef {object} AuthContext
 * @property {boolean} initialized
 * @property {Account | null} account
 * @property {(loginUrl?: string) => Promise<void>} login
 * @property {() => Promise<void>} [loadProfile]
 * @property {() => Promise<void>} signup
 * @property {() => Promise<void>} logout
 * @property {(callback: () => unknown) => () => void} onSessionUpdated
 */

export class NoopAuth {
  initialized = false
  account = null

  async login () { throw new Error('Can\'t use auth, missing context provider') }
  async signup () { throw new Error('Can\'t use auth, missing context provider') }
  async logout () { throw new Error('Can\'t use auth, missing context provider') }
  onSessionUpdated () { return () => undefined }
}

export const DEFAULT_AUTH_CONTEXT = new NoopAuth()
export const authContext = createContext(Symbol('auth'))

/** Sets `host.auth` from the nearest auth provider. Call from the constructor. */
export function consumeAuth (host) {
  return consume(host, 'auth', authContext, DEFAULT_AUTH_CONTEXT)
}
