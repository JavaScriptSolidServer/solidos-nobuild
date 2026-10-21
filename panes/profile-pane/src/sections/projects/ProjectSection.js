import { importCss } from '../../importCss.js'
import { html, nothing } from 'lit-html'
import 'solid-ui/components/button'
import { LiveStore, NamedNode } from 'rdflib'
// (type-only import removed: Layout, ViewerMode from '../../types.js')
// (type-only import removed: ProjectDetails, ProjectRow from './types.js')
import { projectsHeadingText, unfollowProjectFailedMessageText } from '../../texts.js'
import { createProjectsEditDialog } from './ProjectEditDialog.js'
import { processProjectsMutations } from './mutations.js'
import { addIcon, checkMarkIcon, chevronDownIcon, editIcon, plusDarkIcon, twoDownArrowsIcon } from '../../icons-svg/profileIcons.js'
// (type-only import removed: MutationOps from '../shared/types.js')
importCss(new URL('./ProjectSection.css', import.meta.url))
import { toggleCollapsibleSection } from '../shared/collapsibleSection.js'
import { formatDisplayError } from '../../utils/errorDisplay.js'
import { renderResponsiveActionButton } from '../../ui/responsiveActionButton.js'

const MAX_VISIBLE_PROJECTS_MOBILE = 2

function setProjectsSectionError(section, message) {
  const errorBox = section.querySelector('.profile-section-inline-error')
  if (!errorBox) return

  if (!message) {
    errorBox.textContent = ''
    errorBox.hidden = true
    errorBox.setAttribute('aria-hidden', 'true')
    return
  }

  errorBox.textContent = message
  errorBox.hidden = false
  errorBox.setAttribute('aria-hidden', 'false')
  errorBox.focus()
}

function toggleProjectsMobileList(event) {
  const button = event.currentTarget
  const section = button?.closest('.profile-section-collapsible')
  if (!button || !section) return

  const nextExpanded = section.getAttribute('data-mobile-expanded') !== 'true'
  section.setAttribute('data-mobile-expanded', String(nextExpanded))
  button.setAttribute('aria-expanded', String(nextExpanded))
  button.setAttribute('data-mobile-expanded', String(nextExpanded))

  const label = button.querySelector('.project-card__more-label')
  if (label) {
    label.textContent = nextExpanded ? 'View Less' : 'View More'
  }
}

function renderProjectImage(src, altText) {
  return src
    ? html`
        <img
          class="project-card__thumb-image"
          src=${src}
          alt=${altText}
          loading="lazy"
        />
      `
    : html`
        <div class="project-card__thumb-fallback" role="img" aria-label=${altText}>
          ${altText}
        </div>
      `
}

function toProjectRow(project, status) {
  return {
    url: project.url,
    title: project.title,
    imageUrl: project.imageUrl,
    category: project.category,
    name: project.name,
    orgName: project.orgName,
    entryNode: (project.entryNode)?.value || '',
    status
  }
}

function renderProject(
  project,
  store,
  subject,
  viewerMode,
  onSaved
) {
  if (!project) return html``

  const handleUnfollow = async (event) => {
    event.preventDefault()
    event.stopPropagation()
    if (viewerMode !== 'owner') return
    const unfollowButton = event.currentTarget
    const section = (event.currentTarget)?.closest('[data-profile-section="projects"]')

    const removePlan = {
      create: [],
      update: [],
      remove: [toProjectRow(project, 'deleted')]
    }

    try {
      unfollowButton?.setAttribute('disabled', '')
      unfollowButton?.setAttribute('loading', '')
      unfollowButton?.setAttribute('aria-busy', 'true')
      await processProjectsMutations(store, subject, removePlan)
      if (section) {
        setProjectsSectionError(section, null)
      }
      if (onSaved) {
        await onSaved()
      }
    } catch (error) {
      if (section) {
        setProjectsSectionError(section, formatDisplayError(error, unfollowProjectFailedMessageText))
      }
    } finally {
      unfollowButton?.removeAttribute('disabled')
      unfollowButton?.removeAttribute('loading')
      unfollowButton?.setAttribute('aria-busy', 'false')
    }
  }

  const normalizedCategory = (project.category || '').trim().toLowerCase()
  const categoryModifier = normalizedCategory === 'project'
    ? 'project'
    : normalizedCategory === 'community'
      ? 'community'
      : 'unknown'
  const categoryLabel = normalizedCategory && normalizedCategory !== 'unknown'
    ? normalizedCategory.charAt(0).toUpperCase() + normalizedCategory.slice(1)
    : 'Uncategorized'

  return html`
    <li class="project-card" role="listitem">
      <a
        class="project-card__link"
        href=${project.url}
        target="_blank"
        rel="noopener noreferrer"
        aria-label=${project.title ? `Open ${project.title}` : 'Open project link'}
      >
        <div class="project-card__wrapper">
          <div class="project-card__thumb">
            ${renderProjectImage(project.imageUrl, project.title || 'Project preview')}
          </div>
          <div class="project-card__content">
            <div class="project-card__heading-group">
              <h3 class="project-card__title">${project.title || project.url}</h3>
              <p class="project-card__organization">${project.orgName || 'Organization unknown'}</p>
            </div>
            <p class="project-card__category project-card__category--${categoryModifier}">${categoryLabel}</p>
          </div>
        </div>
      </a>
      ${viewerMode === 'owner' ? html`
        <div class="project-card__footer">
          <solid-ui-button
            variant="secondary"
            class="project-card__follow-button"
            aria-label="Unfollow project"
            @click=${handleUnfollow}
          >
            <span slot="left-icon" class="project-card__follow-label project-card__follow-label--default">${checkMarkIcon}</span>
            <span class="project-card__follow-label project-card__follow-label--default">Following</span>
            <span class="project-card__follow-label project-card__follow-label--hover">Unfollow</span>
            <span class="project-card__follow-label project-card__follow-label--loading">Unfollowing...</span>
          </solid-ui-button>
        </div>
      ` : html``}
    </li>
  `
}

function renderOwnerEmptyProjectsContent(
  store,
  subject,
  projectData,
  viewerMode,
  onSaved
) {
  const projectDetails = projectData

  return html`
    <div class="profile__empty-state-content" role="group" aria-label="Empty projects section">
      <h2 id="projects-heading" tabindex="-1">${projectsHeadingText}</h2>
    </div>
    <solid-ui-button
      variant="secondary"
      class="profile__action-button--empty"
      aria-label="Add project details"
      @click=${(event) => {
        return createProjectsEditDialog(
          event,
          store,
          subject,
          projectDetails,
          viewerMode,
          onSaved
        )
      }}
    >
      <span slot="left-icon" class="profile__action-icon" aria-hidden="true">${plusDarkIcon}</span>
       Add Project
    </solid-ui-button>
  `
}

function renderOwnerEmptyProjectSection(
  store,
  subject,
  projectData,
  viewerMode,
  onSaved
) {
  return html`
    <section
      aria-labelledby="projects-heading"
      data-profile-section="projects"
      class="profile__section--empty profile__section--empty-main profile-section-collapsible profile-section-collapsible--inline-mobile-actions profile-section-collapsible--empty-mobile-no-edit"
      role="region"
      tabindex="-1"
      data-expanded="false"
    >
      <header class="profile__section-header profile-section-collapsible__header">
        <h2 id="projects-heading" tabindex="-1">${projectsHeadingText}</h2>
        <div class="profile-section-collapsible__actions">
          <solid-ui-button
            variant="ghost"
            class="profile-section-collapsible__toggle-button"
            aria-label="Toggle projects section"
            aria-controls="projects-panel"
            aria-expanded="false"
            @click=${toggleCollapsibleSection}
          >
            <span slot="icon" class="profile-section-collapsible__chevron" aria-hidden="true">${chevronDownIcon}</span>
          </solid-ui-button>
        </div>
      </header>
      <div id="projects-panel" class="profile-section-collapsible__content">
        ${renderOwnerEmptyProjectsContent(store, subject, projectData, viewerMode, onSaved)}
      </div>
    </section>
  `
}

function renderProjectSectionContent(
  projects,
  store,
  subject,
  viewerMode,
  onSaved
) {
  if (!projects || !projects.length || !projects[0]) return html``

  return html`${renderProject(projects[0], store, subject, viewerMode, onSaved)}${projects.length > 1 ? renderProjectSectionContent(projects.slice(1), store, subject, viewerMode, onSaved) : html``}`
}

function renderProjectSectionDefault(
  store,
  subject,
  projects,
  viewerMode,
  layout,
  onSaved) {
  const hasProjects = Array.isArray(projects) && projects.length > 0
  const hiddenProjectsCount = Math.max(0, projects.length - MAX_VISIBLE_PROJECTS_MOBILE)
  const isOwner = viewerMode === 'owner'

  return html`
      <section
        class="profile__section profile-section-collapsible profile-section-collapsible--inline-mobile-actions"
        data-profile-section="projects"
        aria-labelledby="projects-heading"
        role="region"
        tabindex="-1"
        data-expanded="false"
        data-mobile-expanded="${hiddenProjectsCount > 0 ? 'false' : 'true'}"
      >
        <header class="profile__section-header profile-section-collapsible__header">
          <h2 id="projects-heading">${projectsHeadingText}</h2>
          <div class="profile-section-collapsible__actions">
            ${isOwner ? html`
              ${renderResponsiveActionButton({
                layout,
                className: 'profile-section-collapsible__edit-button',
                ariaLabel: 'Add or edit projects',
                onClick: (event) => createProjectsEditDialog(event, store, subject, projects, viewerMode, onSaved),
                desktopIcon: html`<span slot="left-icon" class="profile-section-collapsible__action-label profile__add-more-icon" aria-hidden="true">${addIcon}</span>`,
                desktopLabel: 'Add More',
                mobileIcon: html`<span slot="icon" class="profile-section-collapsible__edit-icon" aria-hidden="true">${editIcon}</span>`
              })}
            ` : nothing}
            <solid-ui-button
              variant="ghost"
              class="profile-section-collapsible__toggle-button"
              aria-label="Toggle projects section"
              aria-controls="projects-panel"
              aria-expanded="false"
              @click=${toggleCollapsibleSection}
            >
              <span slot="icon" class="profile-section-collapsible__chevron" aria-hidden="true">${chevronDownIcon}</span>
            </solid-ui-button>
          </div>
        </header>
        <div id="projects-panel" class="profile-section-collapsible__content">
          ${hasProjects
            ? html`
                <ul id="projects-rail" class="project-card__rail" role="list" aria-label="Known projects">
                  ${renderProjectSectionContent(
                    projects,
                    store,
                    subject,
                    viewerMode,
                    onSaved
                  )}
                </ul>
                ${hiddenProjectsCount > 0
                  ? html`
                      <solid-ui-button
                        variant="tertiary"
                        class="project-card__more-button"
                        aria-controls="projects-rail"
                        aria-expanded="false"
                        data-mobile-expanded="false"
                        @click=${toggleProjectsMobileList}
                      >
                        <span slot="left-icon" class="project-card__more-icon" aria-hidden="true">${twoDownArrowsIcon}</span>
                        <span class="project-card__more-label">View More</span>
                      </solid-ui-button>
                    `
                  : html``}
                <div
                  class="profile-section-inline-error"
                  role="alert"
                  aria-live="assertive"
                  aria-atomic="true"
                  aria-hidden="true"
                  tabindex="-1"
                  hidden
                ></div>
              `
            : html`<p>No projects added yet.</p>`}
        </div>
      </section>
    `
}

export function renderProjectSection(
  store,
  subject,
  projects,
  viewerMode,
  layout,
  onSaved
) {
  const currentLayout = layout || 'desktop'
  const hasProjects = Array.isArray(projects) && projects.length > 0
  const showOwnerEmptyProject = !hasProjects && viewerMode === 'owner'

  return html`
    ${showOwnerEmptyProject
      ? renderOwnerEmptyProjectSection(store, subject, projects, viewerMode, onSaved)
      : renderProjectSectionDefault(store, subject, projects, viewerMode, currentLayout, onSaved)}
  `
}
