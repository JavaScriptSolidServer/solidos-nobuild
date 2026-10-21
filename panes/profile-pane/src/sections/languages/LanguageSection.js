import { importCss } from '../../importCss.js'
import { html, nothing } from 'lit-html'
import 'solid-ui/components/button'
import { LiveStore, NamedNode } from 'rdflib'
import { ns } from 'solid-ui'
// (type-only import removed: Layout, ViewerMode from '../../types.js')
importCss(new URL('./LanguageSection.css', import.meta.url))
import { createLanguageEditDialog } from './LanguageEditDialog.js'
// (type-only import removed: LanguageDetails from './types.js')
import { addIcon, chevronDownIcon, commentIcon, editIcon } from '../../icons-svg/profileIcons.js'
import { languagesHeadingText } from '../../texts.js'
import { toggleCollapsibleSection } from '../shared/collapsibleSection.js'
import { renderResponsiveActionButton } from '../../ui/responsiveActionButton.js'

function renderLan(language, asList = false) {
  if (!language) return html``
  return asList
    ? html`<li class="languages__item-label" role="listitem">${language.name}</li>`
    : html``
}

function renderLanguages(languages, asList = false) {
  if (!languages || !languages.length || !languages[0]) return html``
  return html`${renderLan(languages[0], asList)}${languages.length > 1 ? renderLanguages(languages.slice(1), asList) : html``}`
}

function renderLanguagesSectionDefault(
  store,
  subject,
  languages,
  viewerMode,
  layout,
  onSaved) {

  const hasLanguages = Array.isArray(languages) && languages.length > 0
  const hasLanguageLinks = store.each(subject, ns.schema('knowsLanguage')).length > 0
  const isOwner = viewerMode === 'owner'
  return html`
    <section
      class="profile__section profile-section-collapsible profile-section-collapsible--inline-mobile-actions"
      data-profile-section="languages"
      aria-labelledby="languages-heading"
      role="region"
      tabindex="-1"
      data-expanded="false"
    >
      <header class="profile__section-header profile-section-collapsible__header">
        <h3 id="languages-heading">${languagesHeadingText}</h3>
        <div class="profile-section-collapsible__actions">
          ${isOwner ? html`
              ${renderResponsiveActionButton({
                layout,
                className: 'profile-section-collapsible__edit-button',
                ariaLabel: 'Add or edit languages',
                onClick: (event) => createLanguageEditDialog(event, store, subject, languages, viewerMode, onSaved),
                desktopIcon: html`<span slot="left-icon" class="profile-section-collapsible__action-label profile__add-more-icon" aria-hidden="true">${addIcon}</span>`,
                desktopLabel: 'Add More',
                mobileIcon: html`<span slot="icon" class="profile-section-collapsible__edit-icon" aria-hidden="true">${editIcon}</span>`
              })}
            ` : nothing}
          <solid-ui-button
            variant="ghost"
            class="profile-section-collapsible__toggle-button"
            aria-label="Toggle languages section"
            aria-controls="languages-panel"
            aria-expanded="false"
            @click=${toggleCollapsibleSection}
          >
            <span slot="icon" class="profile-section-collapsible__chevron" aria-hidden="true">${chevronDownIcon}</span>
          </solid-ui-button>
        </div>
      </header>
      <div id="languages-panel" class="profile-section-collapsible__content">
        ${hasLanguages
          ? html`
              <ul class="languages__list" role="list" aria-label="Known languages">
                ${renderLanguages(languages, true)}
              </ul>
            `
          : hasLanguageLinks
            ? html`<p>Language details are missing for one or more entries.</p>`
            : html`<p>No languages added yet.</p>`}
      </div>
    </section>
  `
}

function renderOwnerEmptyLanguagesContent() {
  return html`
      <div class="profile__empty-state-content" role="group" aria-label="Empty languages section">
        <div class="languages__empty-icon-wrapper">
          <span class="languages__empty-icon">${commentIcon}</span>
        </div>
      </div>
  `
}

function renderOwnerEmptyLanguagesSection(
  store,
  subject,
  languages,
  viewerMode,
  layout,
  onSaved
) {
  return html`
    <section
      aria-labelledby="languages-heading"
      data-profile-section="languages"
      class="profile__section--empty profile__section--empty-sidebar profile-section-collapsible profile-section-collapsible--inline-mobile-actions"
      role="region"
      tabindex="-1"
      data-expanded="false"
    >
      <header class="profile__section-header profile-section-collapsible__header">
        <h3 id="languages-heading" tabindex="-1">${languagesHeadingText}</h3>
        <div class="profile-section-collapsible__actions">
          ${renderResponsiveActionButton({
            layout,
            className: 'profile-section-collapsible__edit-button',
            ariaLabel: 'Add languages',
            onClick: (event) => {
              return createLanguageEditDialog(
                event,
                store,
                subject,
                languages,
                viewerMode,
                onSaved
              )
            },
            desktopIcon: html`<span slot="left-icon" class="profile-section-collapsible__action-label profile__add-more-icon" aria-hidden="true">${addIcon}</span>`,
            desktopLabel: 'Add More',
            mobileIcon: html`<span slot="icon" class="profile-section-collapsible__edit-icon" aria-hidden="true">${editIcon}</span>`
          })}
          <solid-ui-button
            variant="ghost"
            class="profile-section-collapsible__toggle-button"
            aria-label="Toggle languages section"
            aria-controls="languages-panel"
            aria-expanded="false"
            @click=${toggleCollapsibleSection}
          >
            <span slot="icon" class="profile-section-collapsible__chevron" aria-hidden="true">${chevronDownIcon}</span>
          </solid-ui-button>
        </div>
      </header>
      <div id="languages-panel" class="profile-section-collapsible__content">
        ${renderOwnerEmptyLanguagesContent()}
      </div>
    </section>
  `
}

export function renderLanguageSection(
  store,
  subject,
  languages,
  viewerMode,
  layout,
  onSaved
) {
  const currentLayout = layout || 'desktop'
  const safeLanguages = languages || []
  const hasLanguages = Array.isArray(safeLanguages) && safeLanguages.length > 0

  const showOwnerEmptyLanguages = !hasLanguages && viewerMode === 'owner'

  return html`
    ${showOwnerEmptyLanguages
      ? renderOwnerEmptyLanguagesSection(store, subject, safeLanguages, viewerMode, currentLayout, onSaved)
      : renderLanguagesSectionDefault(store, subject, safeLanguages, viewerMode, currentLayout, onSaved)}
      `
}
