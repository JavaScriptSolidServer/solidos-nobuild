import { importCss } from '../../importCss.js'
import { html, nothing } from 'lit-html'
import 'solid-ui/components/button'
// (type-only import removed: BioDetails from './types.js')
// (type-only import removed: Layout, ViewerMode from '../../types.js')
importCss(new URL('./BioSection.css', import.meta.url))
import { bioHeadingText } from '../../texts.js'
import { LiveStore, NamedNode } from 'rdflib'
import {
  scheduleDescriptionOverflowCheck,
  toggleDescription
} from '../shared/sectionCardHelpers.js'
import { createBioEditDialog } from './BioEditDialog.js'
import { editIcon, plusDarkIcon } from '../../icons-svg/profileIcons.js'
import { renderResponsiveActionButton } from '../../ui/responsiveActionButton.js'

function renderBio(bioData) {
  if (!bioData) return html``

  const bioDescriptionId = 'bio-description'

  return html`
      ${bioData.description ? html`
        <div class="bio-card__description-wrap">
          <p class="bio-card__description-text" id=${bioDescriptionId}>${bioData.description}</p>
          <solid-ui-button
            variant="tertiary"
            class="bio-card__description-toggle"
            aria-controls=${bioDescriptionId}
            aria-expanded="false"
            hidden
            @click=${toggleDescription}
          >
            ...more
          </solid-ui-button>
        </div>
      ` : ''}
  `
}

function hasBioContent(bioData) {
  return Boolean((bioData?.description || '').trim())
}

export const BioCard = (
  bioData
) => {
  return html`
    <article class="bio-card" aria-label="Bio" data-testid="bio-card">
      <section class="bio-card__section">
        ${renderBio(bioData)}
      </section>
    </article>
  `
}

function renderBioSectionContent(
  store,
  subject,
  bioData,
  viewerMode,
  layout,
  onSaved
) {
  const bio = BioCard(bioData)
  const bioDetails = bioData
  const isOwner = viewerMode === 'owner'

  return html`
    <header class="profile__section-header profile-section-collapsible__header">
      <h2 id="bio-heading" tabindex="-1">${bioHeadingText}</h2>
        ${isOwner ? html`
              ${renderResponsiveActionButton({
                layout,
                className: 'profile-section-collapsible__edit-button',
                ariaLabel: 'Edit bio',
                onClick: (event) => createBioEditDialog(event, store, subject, bioDetails, viewerMode, onSaved),
                desktopIcon: html`<span slot="left-icon" class="profile-section-collapsible__action-label profile__add-more-icon" aria-hidden="true">${editIcon}</span>`,
                desktopLabel: 'Edit',
                mobileIcon: html`<span slot="icon" class="profile-section-collapsible__edit-icon" aria-hidden="true">${editIcon}</span>`
              })}
            ` : nothing}
    </header>
    <div class="profile-section-collapsible__content">
      ${bio}
    </div>
  `
}

function renderBioSectionDefault(
  store,
  subject,
  bioData,
  viewerMode,
  layout,
  onSaved
) {
  return html`
    <section
      aria-labelledby="bio-heading"
      data-profile-section="bio"
      class="profile__section"
      role="region"
      tabindex="-1"
    >
      ${renderBioSectionContent(store, subject, bioData, viewerMode, layout, onSaved)}
    </section>
  `
}

function renderOwnerEmptyBioContent(
  store,
  subject,
  bioData,
  viewerMode,
  onSaved
) {
  const bioDetails = bioData

  return html`
    <div class="profile__empty-state-content" role="group" aria-label="Empty bio section">
      <h2 id="bio-heading" tabindex="-1">${bioHeadingText}</h2>
      <p class="profile__empty-state-message">
        You haven't added any professional experience yet. Adding work history can boost your Bio.
      </p>
    </div>
    <solid-ui-button
      variant="secondary"
      class="profile__action-button--empty"
      @click=${(event) => {
        return createBioEditDialog(
          event,
          store,
          subject,
          bioDetails,
          viewerMode,
          onSaved
        )
      }}
    >
      <span slot="left-icon" class="profile__action-icon" aria-hidden="true">${plusDarkIcon}</span>
      <span class="profile__action-icon">Add Bio</span>
    </solid-ui-button>
  `
}

function renderOwnerEmptyBioSection(
  store,
  subject,
  bioData,
  viewerMode,
  onSaved
) {
  return html`
    <section
      aria-labelledby="bio-heading"
      data-profile-section="bio"
      class="profile__section--empty profile__section--empty-main bio-section--empty"
      role="region"
      tabindex="-1"
    >
      ${renderOwnerEmptyBioContent(store, subject, bioData, viewerMode, onSaved)}
    </section>
  `
}

export function renderBioSection(
  store,
  subject,
  bioData,
  viewerMode,
  layout,
  onSaved
) {
  scheduleDescriptionOverflowCheck()
  const currentLayout = layout || 'desktop'
  const hasBio = hasBioContent(bioData)
  const showOwnerEmptyBio = !hasBio && viewerMode === 'owner'

  return html`
    ${showOwnerEmptyBio
      ? renderOwnerEmptyBioSection(store, subject, bioData, viewerMode, onSaved)
      : renderBioSectionDefault(store, subject, bioData, viewerMode, currentLayout, onSaved)}
  `
}
