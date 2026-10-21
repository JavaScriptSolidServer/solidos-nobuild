/** Project-local: currently unused component. Keep temporarily; do not add new usage. */
// (type-only import removed: DataBrowserContext from 'pane-registry')
import { NamedNode, Store} from 'rdflib'
const socialMediaForm = await (await fetch(new URL('../ontology/socialMedia.ttl', import.meta.url))).text()
import renderForm from '../rdfFormsHelper.js'
import { socialAccountsHeadingText } from '../texts.js'

const socialMediaFormName = 'socialMedia.ttl' // The name of the form file

export function EditSocialSection(context, me, editableProfile, store) {
  const section = context.dom.createElement('section')
  section.setAttribute('data-testid', 'edit-social-section')
  section.setAttribute('aria-labelledby', 'edit-profile-social-heading')
  section.classList.add('profileSection', 'section-bg', 'profile-form')

  const header = context.dom.createElement('header')
  header.classList.add('text-center', 'mb-md')

  const heading = context.dom.createElement('h2')
  heading.id = 'edit-profile-social-heading'
  heading.classList.add('section-title')
  heading.textContent = socialAccountsHeadingText

  header.appendChild(heading)
  section.appendChild(header)

  if (!editableProfile) {
    const comment1 = context.dom.createElement('p')
    comment1.classList.add('p-md')
    comment1.textContent = 'Login to add social media accounts to your profile.'
    section.appendChild(comment1)
  }

  renderForm(section, me, socialMediaForm, socialMediaFormName, store, context.dom, editableProfile)

  return section
}
