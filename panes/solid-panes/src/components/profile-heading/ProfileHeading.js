import { loadSheet } from '../../loadSheet.js'
import { authn, store } from 'solid-logic'

import { customElement, WebComponent, widgets } from 'solid-ui'
import { html, nothing,} from 'lit'
import { createHeadingEditDialog } from './editor/sections/heading/HeadingEditDialog.js'

import { addFriend, checkFriend, friendTexts } from './friendActions.js'
import { formatDisplayError } from './editor/utils/errorDisplay.js'
import 'solid-ui/components/button'
import '../../icons.js'
const styles = await loadSheet(new URL('./ProfileHeading.styles.css', import.meta.url))

// The heading renders a subset of the shared presentation model used by the editor.

export default class ProfileHeading extends WebComponent {
  static properties = {
    profileData: { attribute: false },
    subject: { attribute: false },
    editContext: { attribute: false },
    friendSubject: { attribute: false },
    compact: { type: Boolean, reflect: true },
    failedImageSrc: { state: true },
    friendState: { state: true },
    friendMessage: { state: true },
    friendError: { state: true },
  }

  constructor () {
    super()
    this.profileData = undefined
    this.subject = undefined
    this.editContext = undefined
    this.friendSubject = undefined
    this.compact = false
    this.failedImageSrc = undefined
    this.friendState = 'loading'
    this.friendMessage = ''
    this.friendError = false
  }

  static styles = styles

  friendRequest = 0
  friendRequestInterrupted = false
  friendMessageTimer
  draggableSubject = { uri: '' }
  draggableElementsAttached = false

  connectedCallback () {
    super.connectedCallback()
    if (this.friendRequestInterrupted) {
      this.friendRequestInterrupted = false
      this.startFriendCheck()
    }
  }

  disconnectedCallback () {
    super.disconnectedCallback()
    this.friendRequest++
    if (this.friendState === 'loading' || this.friendState === 'saving') {
      this.friendRequestInterrupted = true
    }
    this.clearFriendMessage()
  }

  clearFriendMessage () {
    clearTimeout(this.friendMessageTimer)
    this.friendMessageTimer = undefined
    this.friendMessage = ''
  }

  willUpdate (changed) {
    super.willUpdate(changed)
    if (changed.has('profileData') && changed.get('profileData')?.imageSrc !== this.profileData?.imageSrc) {
      this.failedImageSrc = undefined
    }
    if (!changed.has('friendSubject')) return
    this.friendRequestInterrupted = false
    this.startFriendCheck()
  }

  updated () {
    if (this.subject) this.draggableSubject.uri = this.subject.value
    if (this.draggableElementsAttached || !this.subject) return

    const heading = this.shadowRoot?.querySelector('.profile-heading')
    const name = this.shadowRoot?.querySelector('.name')
    if (!heading || !name) return

    widgets.makeDraggable(heading, this.draggableSubject)
    widgets.makeDraggable(name, this.draggableSubject)
    this.draggableElementsAttached = true
  }

  startFriendCheck () {
    const request = ++this.friendRequest
    this.friendState = 'loading'
    this.clearFriendMessage()
    this.friendError = false
    const subject = this.friendSubject
    const viewer = authn.currentUser()
    if (!subject || !viewer || viewer.sameTerm(subject)) return

    checkFriend(viewer, subject).then((exists) => {
      if (request !== this.friendRequest || this.friendSubject !== subject) return
      this.friendState = exists ? 'exists' : 'available'
    }).catch((error) => {
      if (request !== this.friendRequest || this.friendSubject !== subject) return
      this.friendState = 'error'
      this.showFriendMessage(error, true)
    })
  }

  async showFriendMessage (message, error) {
    this.clearFriendMessage()
    this.friendMessage = formatDisplayError(message)
    this.friendError = error
    this.friendMessageTimer = setTimeout(() => {
      this.clearFriendMessage()
    }, 10000)
    await this.updateComplete
    this.shadowRoot?.querySelector('.friend-message')?.focus()
  }

  handleAddFriend = async (event) => {
    event.preventDefault()
    if (this.friendState !== 'available' && this.friendState !== 'error') return
    const subject = this.friendSubject
    if (!subject) return
    const request = this.friendRequest
    this.friendState = 'saving'
    this.clearFriendMessage()
    try {
      const viewer = authn.currentUser()
      if (!viewer) throw new Error(friendTexts.loginRequired)
      await addFriend(viewer, subject)
      if (request !== this.friendRequest || this.friendSubject !== subject) return
      this.friendState = 'exists'
      await this.showFriendMessage(friendTexts.success, false)
    } catch (error) {
      if (request !== this.friendRequest || this.friendSubject !== subject) return
      this.friendState = 'error'
      await this.showFriendMessage(error, true)
    }
  }

  handleEdit = (event) => {
    const context = this.editContext
    if (!context) return

    createHeadingEditDialog(
      event,
      store,
      context.subject,
      context.profileData,
      context.viewerMode,
      async () => {
        this.dispatchEvent(new CustomEvent('profile-heading-saved', {
          bubbles: true,
          composed: true,
          detail: { subjectUri: context.subject.value }
        }))
        await context.onSaved()
      }
    ).catch((error) => {
      console.error('Failed to edit profile heading.', error)
    })
  }

  handleImageError = (event) => {
    this.failedImageSrc = (event.currentTarget).getAttribute('src') ?? undefined
  }

  render () {
    const profile = this.profileData
    if (!profile) return html``

    const phone = textValue(profile.primaryPhone?.valueNode).replace(/^tel:/i, '')
    const email = textValue(profile.primaryEmail?.valueNode).replace(/^mailto:/i, '')
    const dateOfBirth = displayDate(profile.dateOfBirth)
    const showImage = Boolean(profile.imageSrc && this.failedImageSrc !== profile.imageSrc)
    const viewer = authn.currentUser()
    const showFriend = Boolean(this.friendSubject && viewer && !viewer.sameTerm(this.friendSubject))

    return html`
      <section class="profile-heading" aria-labelledby="profile-heading-name">
        <div class="avatar">
          <div class="image-frame ${showImage ? '' : 'image-frame--fallback'}">
            ${showImage
              ? html`<img
                  class="hero"
                  src=${profile.imageSrc}
                  alt=${profile.name}
                  width="140"
                  height="140"
                  loading="eager"
                  @error=${this.handleImageError}
                />`
              : nothing}
              <div class="hero-fallback" role="img" aria-label=${profile.name}>
                <icon-lucide-circle-user-round aria-hidden="true"></icon-lucide-circle-user-round>
              </div>
          </div>
        </div>

        <div class="info">
          <header class="header-bar">
            <div class="identity" role="group" aria-label=${this.compact ? 'Name' : 'Name and pronouns'}>
              <h1 id="profile-heading-name" class="name">${profile.name}</h1>
              ${profile.pronouns ? html`<span class="pronouns" ?hidden=${this.compact}>(${profile.pronouns})</span>` : nothing}
            </div>
            ${profile.jobTitle ? html`<div class="role">${profile.jobTitle}</div>` : nothing}
          </header>
        </div>

        ${(this.editContext && !this.compact) || showFriend
          ? html`
            <div class="profile__actions profile__heading-edit-action">
              ${showFriend
                ? html`
                <div class="profile-friends-button__section" role="group" aria-label="Friend relationship actions">
                  <solid-ui-button
                    variant="secondary"
                    class="profile__btn-friends"
                    ?disabled=${this.friendState === 'loading' || this.friendState === 'saving' || this.friendState === 'exists'}
                    aria-busy=${this.friendState === 'loading' || this.friendState === 'saving' ? 'true' : 'false'}
                    @click=${this.handleAddFriend}
                  >${this.friendState === 'exists'
                    ? nothing
                    : html`<icon-lucide-user-round-plus slot="icon" class="profile__btn-friends-icon" aria-hidden="true"></icon-lucide-user-round-plus>`}${this.friendState === 'exists' ? friendTexts.exists : friendTexts.add}</solid-ui-button>
                  ${this.friendMessage
                    ? html`
                    <div class="friend-message" role=${this.friendError ? 'alert' : 'status'}
                      aria-live=${this.friendError ? 'assertive' : 'polite'} tabindex="0">
                      ${this.friendMessage}
                    </div>`
                    : nothing}
                </div>
              `
                : nothing}
              ${this.editContext && !this.compact
                ? html`
              <solid-ui-button
                variant="tertiary"
                class="profile-section-collapsible__edit-button desktop-edit-button"
                aria-label="Add or edit heading information"
                @click=${this.handleEdit}
              >
                <span slot="left-icon" class="profile-section-collapsible__action-label profile__add-more-icon" aria-hidden="true">
                  ${this.renderEditIcon()}
                </span>
                <span class="profile-section-collapsible__action-label edit-label">Edit</span>
              </solid-ui-button>
              <solid-ui-button
                variant="ghost"
                class="profile-section-collapsible__edit-button mobile-edit-button"
                aria-label="Add or edit heading information"
                @click=${this.handleEdit}
              >
                <span slot="icon" class="profile-section-collapsible__edit-icon" aria-hidden="true">
                  ${this.renderEditIcon()}
                </span>
              </solid-ui-button>
              `
                : nothing}
            </div>
          `
          : nothing}

        <div class="details-collapse" aria-hidden=${this.compact ? 'true' : 'false'} ?inert=${this.compact}>
          <div class="details">
            <div class="detail-row" role="group" aria-label="Additional profile information">
              ${this.renderLine(dateOfBirth, 'birthday')}
              ${this.renderLine(profile.location, 'location')}
            </div>
            <div class="detail-row" role="group" aria-label="Contact information">
              ${this.renderLine(phone, 'phone')}
              ${this.renderLine(email, 'email')}
            </div>
          </div>
        </div>
      </section>
    `
  }

  renderLine (value, icon) {
    if (!value) return nothing

    return html`
      <div class="detail-item">
        <span class="detail-icon" aria-hidden="true">
          ${this.renderIcon(icon)}
        </span>
        <span class="detail-value">${value}</span>
      </div>
    `
  }

  renderIcon (icon) {
    switch (icon) {
      case 'birthday':
        return html`<icon-lucide-cake aria-hidden="true"></icon-lucide-cake>`
      case 'location':
        return html`<icon-lucide-map-pin aria-hidden="true"></icon-lucide-map-pin>`
      case 'phone':
        return html`<icon-lucide-phone aria-hidden="true"></icon-lucide-phone>`
      case 'email':
        return html`<icon-lucide-mail aria-hidden="true"></icon-lucide-mail>`
    }
  }

  renderEditIcon () {
    return html`<icon-lucide-pencil aria-hidden="true"></icon-lucide-pencil>`
  }
}

if (!customElements.get('solid-panes-profile-heading')) customElements.define('solid-panes-profile-heading', ProfileHeading)

function textValue (value) {
  return value?.value ?? ''
}

function displayDate (value) {
  const raw = (value || '').trim()
  const isoDate = raw.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (isoDate) {
    const [, year, month, day] = isoDate
    return `${day}-${month}-${year}`
  }

  const dmyDate = raw.match(/^(\d{2})[/-](\d{2})[/-](\d{4})$/)
  if (dmyDate) {
    const [, day, month, year] = dmyDate
    return `${day}-${month}-${year}`
  }

  return raw
}
