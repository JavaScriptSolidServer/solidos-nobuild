/** Project-local: currently unused component. Keep temporarily; do not add new usage. */
// (type-only import removed: DataBrowserContext from 'pane-registry')
import { NamedNode } from 'rdflib'
import { yourContactInformationHeading } from '../texts.js'

export function EditContactsSection(context, me) {
  const section = context.dom.createElement('section')
  section.setAttribute('aria-labelledby', 'edit-profile-contact-heading')
  section.classList.add('profileSection', 'section-bg', 'profile-form')

  const header = context.dom.createElement('header')
  header.classList.add('text-center', 'mb-md')
  const heading = context.dom.createElement('h2')
  heading.id = 'edit-profile-contact-heading'
  heading.classList.add('section-title')
  heading.textContent = yourContactInformationHeading
  header.appendChild(heading)
  section.appendChild(header)

  section.appendChild(paneDiv(context, me, 'contact'))

  return section
}

function paneDiv (
  context,
  subject,
  paneName
) {
  const view = context.session.paneRegistry.byName(paneName)
  if (!view) {
    const warning = context.dom.createElement('div')
    warning.innerText = `Unable to load view: ${paneName}`
    return warning
  }
  const viewContainer = view.render(subject, context)

  // Handle different node types
  let container

  if (viewContainer && typeof viewContainer.setAttribute === 'function') {
    // It's already an Element node
    container = viewContainer
  } else if (viewContainer && viewContainer.nodeType === Node.TEXT_NODE) {
    // It's a Text node, wrap it in a section for semantics
    container = context.dom.createElement('section')
    container.appendChild(viewContainer)
  } else {
    // Fallback for other cases
    container = context.dom.createElement('section')
    container.innerText = `View render did not return a valid Node for: ${paneName}`
  }

  container.setAttribute('role', 'region')
  container.setAttribute('aria-label', `${paneName} section`)
  return container
}
