/** Project-local: currently unused component. Keep temporarily; do not add new usage. */
// (type-only import removed: DataBrowserContext from 'pane-registry')
import { NamedNode, Store} from 'rdflib'
const otherPreferencesForm = await (await fetch(new URL('../ontology/otherPreferencesForm.ttl', import.meta.url))).text()
import renderForm from '../rdfFormsHelper.js'
import { otherPreferencesHeadingText } from '../texts.js'

const otherPreferencesFormName = 'otherPreferencesForm.ttl' // The name of the form file

export function EditOtherPreferencesSection(context, me, editableProfile, store) {
  const section = context.dom.createElement('section')
  section.setAttribute('data-testid', 'edit-other-preferences-section')
  section.setAttribute('aria-labelledby', 'edit-profile-other-preferences-heading')
  section.classList.add('profileSection', 'section-bg', 'profile-form')

  const header = context.dom.createElement('header')
  header.classList.add('text-center', 'mb-md')

  const heading = context.dom.createElement('h2')
  heading.id = 'edit-profile-other-preferences-heading'
  heading.classList.add('section-title')
  heading.textContent = otherPreferencesHeadingText

  header.appendChild(heading)
  section.appendChild(header)

  renderForm(section, me, otherPreferencesForm, otherPreferencesFormName, store, context.dom, editableProfile)

  return section
}
