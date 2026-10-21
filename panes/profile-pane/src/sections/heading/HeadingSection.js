import { importCss } from '../../importCss.js'
import { html, nothing } from 'lit-html'
importCss(new URL('./HeadingSection.css', import.meta.url))
// (type-only import removed: ProfileDetails from './types.js')
// (type-only import removed: DataBrowserContext from 'pane-registry')
import { NamedNode } from 'rdflib'
// (type-only import removed: Layout, ViewerMode from '../../types.js')
import { createHeadingEditDialog } from './HeadingEditDialog.js'
import { toText } from '../../textUtils.js'
import { toDisplayDateDMY } from './dateHelpers.js'
import { birthdayIcon, editIcon, locationIcon, personInCircleIcon } from '../../icons-svg/profileIcons.js'
import { emailIcon, phoneIcon } from '../../icons-svg/contactIcons.js'
import { addMeToYourFriendsDiv } from '../../specialButtons/addMeToYourFriends.js'
import { resolvePhotoDisplaySrc } from './imageHelpers.js'
import { renderResponsiveActionButton } from '../../ui/responsiveActionButton.js'

const showHeadingImageFallback = (event) => {
  const image = event.currentTarget
  const frame = image?.parentElement
  if (!image || !frame) {
    return
  }

  image.hidden = true
  frame.classList.add('profile__image-frame--fallback')
}

export const renderHeadingSection = async (
  context,
  subject,
  profileData,
  viewerMode,
  layout,
  onSaved
) => {
  const currentLayout = layout || 'desktop'
  const { name, pronouns, jobTitle, dateOfBirth, location, primaryPhone, primaryEmail, imageSrc } = profileData
  const resolvedImageSrc = await resolvePhotoDisplaySrc(context.session.store, imageSrc)
  const isOwner = viewerMode === 'owner'
  const isAuthenticatedViewer = viewerMode === 'authenticated'
  const friendsButton = isAuthenticatedViewer ? addMeToYourFriendsDiv(subject, context, viewerMode) : nothing

  const phoneValue = toText(primaryPhone?.valueNode).replace(/^tel:/i, '')
  const emailValue = toText(primaryEmail?.valueNode).replace(/^mailto:/i, '')
  const dateOfBirthDisplay = toDisplayDateDMY(toText(dateOfBirth), '')

  return html`
      <section class="profile__section" data-profile-section="heading" aria-labelledby="profile-name">
        <div class="profile__heading-top">
          <div class="profile__avatar">
            ${Image(resolvedImageSrc, name)}
          </div>
          <div class="profile__info">
            <header class="profile__header-bar">
              <div class="profile__identity" role="group" aria-label="Name and pronouns">
                <h1 id="profile-name" class="profile__name">${name}</h1>
                <span class="profile__pronouns">${pronouns ? `(${pronouns})` : ''}</span>
              </div>
              ${jobTitle ? html`<div class="profile__role-org">${jobTitle}</div>` : nothing}
            </header>
          </div>
          ${isOwner || isAuthenticatedViewer ? html`
                ${isAuthenticatedViewer ? html`
                  <div class="profile__actions profile__heading-actions">
                    ${friendsButton}
                  </div>
                ` : nothing}
                ${isOwner ? html`
                  <div class="profile__actions profile__heading-edit-action">
                    ${renderResponsiveActionButton({
                      layout: currentLayout,
                      className: 'profile-section-collapsible__edit-button',
                      ariaLabel: 'Add or edit heading information',
                      onClick: (event) => createHeadingEditDialog(event, context.session.store, subject, profileData, viewerMode, onSaved),
                      desktopIcon: html`<span slot="left-icon" class="profile-section-collapsible__action-label profile__add-more-icon" aria-hidden="true">${editIcon}</span>`,
                      desktopLabel: 'Edit',
                      mobileIcon: html`<span slot="icon" class="profile-section-collapsible__edit-icon" aria-hidden="true">${editIcon}</span>`
                    })}
                  </div>
                ` : nothing}
            ` : nothing}
          <div class="profile__details">
            <div class="profile__meta-row" role="group" aria-label="Additional profile information">
              ${Line(dateOfBirthDisplay, birthdayIcon, '')}
              ${Line(location, locationIcon, '')}
            </div>
            <div class="profile__contact-row" role="group" aria-label="Contact information">
              ${Line(phoneValue, phoneIcon, '')}
              ${Line(emailValue, emailIcon, '')}
            </div>
          </div>
        </div>
    </section>
  `
}

const Line = (value, prefix = nothing, label = '') =>
  value ? html`
    <div class="profile__item ${label ? '' : 'profile__item--valueOnly'}">
      ${label ? html`<span class="profile__label">${label}</span>` : nothing}
      <span class="profile__value">
        ${prefix !== '' && prefix !== nothing ? html`<span class="profile__prefix-icon" aria-hidden="true">${prefix}</span>` : nothing}
        <span class="profile__value-text">${value}</span>
      </span>
    </div>
  ` : nothing

export const Image = (src, alt) => html`
  <div class=${src ? 'profile__image-frame' : 'profile__image-frame profile__image-frame--fallback'}>
    ${src
      ? html`
          <img
            class="profile__hero"
            src=${src}
            alt="${alt}"
            width="140"
            height="140"
            loading="eager"
            @error=${showHeadingImageFallback}
          />
        `
      : nothing}
    <div class="profile__hero-alt" role="img" aria-label="${alt}">
      <span class="profile__hero-icon">${personInCircleIcon}</span>
    </div>
  </div>
`
