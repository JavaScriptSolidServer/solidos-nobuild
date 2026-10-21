import { importCss } from '../../importCss.js'
import { html, nothing } from 'lit-html'
import 'solid-ui/components/button'
// (type-only import removed: Account, SocialPresentation from './types.js')
// (type-only import removed: Layout, ViewerMode from '../../types.js')
importCss(new URL('./SocialSection.css', import.meta.url))
import { socialAccountsHeadingText } from '../../texts.js'
import { createSocialEditDialog } from './SocialEditDialog.js'
import { LiveStore, NamedNode } from 'rdflib'
import { toggleCollapsibleSection } from '../shared/collapsibleSection.js'
import { addIcon, chevronDownIcon, editIcon, globeIcon } from '../../icons-svg/profileIcons.js'
import { renderResponsiveActionButton } from '../../ui/responsiveActionButton.js'

const MAX_VISIBLE_SOCIAL_ACCOUNTS_MOBILE = 10

function isRenderableAccount(account) {
  return Boolean(account?.homepage && account?.name && account?.icon)
}

function expandSocialAccounts(event) {
  const button = event.currentTarget
  const socialCard = button?.closest('.social-card')
  if (!button || !socialCard) return

  socialCard.setAttribute('data-mobile-expanded', 'true')
  button.setAttribute('aria-expanded', 'true')
  button.hidden = true
}

export const SocialCard = (
  SocialData,
  _viewerMode
) => {
  const accounts = (SocialData.accounts || []).filter(isRenderableAccount)
  const hiddenAccountsCount = Math.max(0, accounts.length - MAX_VISIBLE_SOCIAL_ACCOUNTS_MOBILE)

  if (accounts.length) {

    return html`
      <section
        id="social-media"
        class="social-card"
        aria-label="Social media"
        SocialData: SocialPresentation
      >
        <nav aria-label="Social media profiles">
          <ul class="social-card__list" role="list">
            ${accounts.map(account => renderAccount(account))}
          </ul>
        </nav>
        ${hiddenAccountsCount > 0
          ? html`
              <solid-ui-button
                variant="tertiary"
                class="social-card__more-button"
                aria-controls="social-media"
                aria-expanded="false"
                @click=${expandSocialAccounts}
              >
                ${hiddenAccountsCount} more
              </solid-ui-button>
            `
          : html``}
      </section>
    `
  }

  return html``

  function renderAccount(account) {
    return html`
      <li class="social-card__item" role="listitem">
        <a
          class="social-card__link"
          href="${account.homepage}"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Visit ${account.name} profile (opens in new tab)"
        >
          <img
            class="social-card__icon"
            src="${account.icon}"
            alt="${account.name} icon"
            width="40"
            height="40"
            loading="lazy"
          />
        </a>
      </li>
    `
  }

}

function renderSocialSectionContent(
  socialData,
  viewerMode
) {
  const hasAccounts = socialData.accounts && socialData.accounts.length > 0

  return html`
    ${hasAccounts ? SocialCard(socialData, viewerMode) : html`<p>No social accounts added yet.</p>`}
  `
}

function renderSocialSectionDefault(
  store,
  subject,
  socialData,
  viewerMode,
  layout,
  onSaved) {
  const isOwner = viewerMode === 'owner'

  return html`
        <section
          aria-labelledby="social-heading"
          data-profile-section="social"
          class="profile__section profile-section-collapsible profile-section-collapsible--inline-mobile-actions"
          role="region"
          tabindex="-1"
          data-expanded="false"
        >
          <header class="profile__section-header profile-section-collapsible__header">
            <h3 id="social-heading" tabindex="-1">${socialAccountsHeadingText}</h3>
            <div class="profile-section-collapsible__actions">
             ${isOwner ? html`
                ${renderResponsiveActionButton({
                  layout,
                  className: 'profile-section-collapsible__edit-button',
                  ariaLabel: 'Edit social accounts',
                  onClick: (event) => createSocialEditDialog(event, store, subject, socialData.accounts, viewerMode, onSaved),
                  desktopIcon: html`<span slot="left-icon" class="profile-section-collapsible__action-label profile__add-more-icon" aria-hidden="true">${addIcon}</span>`,
                  desktopLabel: 'Add More',
                  mobileIcon: html`<span slot="icon" class="profile-section-collapsible__edit-icon" aria-hidden="true">${editIcon}</span>`
                })}
              ` : nothing}
              <solid-ui-button
                variant="ghost"
                class="profile-section-collapsible__toggle-button"
                aria-label="Toggle social accounts section"
                aria-controls="social-panel"
                aria-expanded="false"
                @click=${toggleCollapsibleSection}
              >
                <span slot="icon" class="profile-section-collapsible__chevron" aria-hidden="true">${chevronDownIcon}</span>
              </solid-ui-button>
            </div>
          </header>
          <div id="social-panel" class="profile-section-collapsible__content">
            ${renderSocialSectionContent(socialData, viewerMode)}
          </div>
        </section>
      `
}

function renderOwnerEmptySocialContent() {
  return html`
      <div class="profile__empty-state-content" role="group" aria-label="Empty social accounts section">
        <div class="social__empty-icon-wrapper">
          <span class="social__empty-icon">${globeIcon}</span>
        </div>
      </div>
  `
}

function renderOwnerEmptySocialSection(
  store,
  subject,
  socialData,
  viewerMode,
  layout,
  onSaved
) {
  return html`
    <section
      aria-labelledby="social-heading"
      data-profile-section="social"
      class="profile__section--empty profile-section-collapsible profile-section-collapsible--inline-mobile-actions"
      role="region"
      tabindex="-1"
      data-expanded="false"
    >
      <header class="profile__section-header profile-section-collapsible__header">
        <h3 id="social-heading" tabindex="-1">${socialAccountsHeadingText}</h3>
        <div class="profile-section-collapsible__actions">
          ${renderResponsiveActionButton({
            layout,
            className: 'profile-section-collapsible__edit-button',
            ariaLabel: 'Add social accounts',
            onClick: (event) => {
              return createSocialEditDialog(
                event,
                store,
                subject,
                socialData.accounts,
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
            aria-label="Toggle social accounts section"
            aria-controls="social-panel"
            aria-expanded="false"
            @click=${toggleCollapsibleSection}
          >
            <span slot="icon" class="profile-section-collapsible__chevron" aria-hidden="true">${chevronDownIcon}</span>
          </solid-ui-button>
        </div>
      </header>
      <div id="social-panel" class="profile-section-collapsible__content">
        ${renderOwnerEmptySocialContent()}
      </div>
    </section>
  `
}

export function renderSocialSection(
  store,
  subject,
  socialData,
  viewerMode,
  layout,
  onSaved
) {
  const currentLayout = layout || 'desktop'
  const safeSocialData = socialData || { accounts: [] }
  const hasAccounts = Array.isArray(safeSocialData.accounts) && safeSocialData.accounts.length > 0
  const showOwnerEmptyAccounts = !hasAccounts && viewerMode === 'owner'

  return html`
    ${showOwnerEmptyAccounts
      ? renderOwnerEmptySocialSection(store, subject, safeSocialData, viewerMode, currentLayout, onSaved)
      : renderSocialSectionDefault(store, subject, safeSocialData, viewerMode, currentLayout, onSaved)}
  `
}
