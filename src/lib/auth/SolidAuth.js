import { authn, authSession, reloadOnIdentityReplaced, solidLogicSingleton } from 'solid-logic'
import { Account } from './context.js'
import { showDialog } from '../dialogs.js'

export const DEFAULT_SIGNUP_URL = 'https://solidproject.org/get_a_pod'

// Upstream builds these with solid-namespace + rdflib (lib/ns.js); spelt out here
// so the auth path doesn't pull a second rdflib in next to solid-logic's.
const AVATAR_PREDICATES = [
  'http://rdfs.org/sioc/ns#avatar',
  'http://xmlns.com/foaf/0.1/img',
  'http://www.w3.org/2006/vcard/ns#logo',
  'http://www.w3.org/2006/vcard/ns#hasPhoto',
  'http://www.w3.org/2006/vcard/ns#photo',
  'http://xmlns.com/foaf/0.1/depiction',
]

function findAccountImage (webId) {
  const store = solidLogicSingleton.store
  const me = store.sym(webId)

  for (const predicate of AVATAR_PREDICATES) {
    const image = store.any(me, store.sym(predicate))

    if (image) return image.value
  }

  return undefined
}

export default class SolidAuth {
  constructor (signupUrl = DEFAULT_SIGNUP_URL) {
    this.signupUrl = signupUrl
    this._initialized = false
    this.profileLoaded = false
    this.listeners = []
  }

  async initialize () {
    authSession.events.on('sessionRestore', () => {
      solidLogicSingleton.store.updater.flagAuthorizationMetadata()
    })

    // An identity that was actively established was replaced while the session
    // stayed active (A -> B, e.g. from another tab): everything fetched under
    // the previous identity is stale, so the app reloads. A logout is not a
    // reload case here — the derived info already reports logged out and the
    // logout path runs its own cleanup and navigation.
    reloadOnIdentityReplaced(authSession.events, () => {
      if (authSession.info?.isLoggedIn) window.location.reload()
    })

    await authn.checkUser()

    this._initialized = true
    this.listeners.forEach(listener => listener())
  }

  async loadProfile () {
    if (this.profileLoaded || !this.account) return

    this.profileLoaded = true

    await solidLogicSingleton.profile.loadMe()

    this.listeners.forEach(listener => listener())
  }

  get initialized () {
    return this._initialized
  }

  get account () {
    const webId = authSession.webId ?? authSession.info?.webId
    const isActive = authSession.isActive ?? authSession.info?.isLoggedIn ?? Boolean(webId)

    if (!isActive || !webId) return null

    return new Account(webId, findAccountImage(webId))
  }

  async login (loginUrl) {
    if (!loginUrl) {
      // Lazy, so the login modal and combobox only load when someone logs in.
      const { default: LoginModal } = await import('../../components/login-modal/LoginModal.js')

      showDialog(LoginModal)

      return
    }

    // clear authorization metadata from store
    solidLogicSingleton.store.updater.flagAuthorizationMetadata()

    const preLoginRedirectHash = new URL(window.location.href).hash

    if (preLoginRedirectHash) {
      window.localStorage.setItem('preLoginRedirectHash', preLoginRedirectHash)
    }

    window.localStorage.setItem('loginIssuer', loginUrl)

    const locationUrl = new URL(window.location.href)

    locationUrl.hash = ''

    await authSession.login(loginUrl, locationUrl.href)
  }

  async signup () {
    window.open(this.signupUrl, '_blank', 'noopener,noreferrer')
  }

  async logout () {
    await authSession.logout()
  }

  onSessionUpdated (callback) {
    const listener = () => { callback() }

    this.listeners.push(listener)

    if (typeof authSession.addEventListener === 'function') {
      authSession.addEventListener('sessionStateChange', listener)
    } else {
      authSession.events.on('login', listener)
      authSession.events.on('logout', listener)
      authSession.events.on('sessionRestore', listener)
    }

    return () => {
      this.listeners = this.listeners.filter(_listener => _listener !== listener)

      if (typeof authSession.removeEventListener === 'function') {
        authSession.removeEventListener('sessionStateChange', listener)
      } else {
        authSession.events.off('login', listener)
        authSession.events.off('logout', listener)
        authSession.events.off('sessionRestore', listener)
      }
    }
  }
}
