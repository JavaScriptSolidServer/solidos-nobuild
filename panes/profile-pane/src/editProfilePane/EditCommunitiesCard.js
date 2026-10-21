import { importCss } from '../importCss.js'
/** Project-local: currently unused component. Keep temporarily; do not add new usage. */
// (type-only import removed: DataBrowserContext from 'pane-registry')
import { NamedNode } from 'rdflib'
import { ns, widgets, icons } from 'solid-ui'
import { communitiesHeadingText } from '../texts.js'
import { store } from 'solid-logic'
importCss(new URL('../styles/editProfile.css', import.meta.url))
import {
  clearPreviousMessage, complain
} from '../buttonsHelper.js'
import { saveNewThing } from '../specialButtons/addMeToYourFriends.js'
import { isAWebID, refresh } from './editProfilePresenter.js'

const GREEN_PLUS = icons.iconBase + 'noun_34653_green.svg'

export function EditProfileCommunitiesSection(context, me, editableProfile) {
  const section = context.dom.createElement('section')
  section.setAttribute('aria-labelledby', 'edit-profile-communities-heading')
  section.classList.add('profileSection', 'section-bg')

  const header = context.dom.createElement('header')
  header.classList.add('text-center', 'mb-md')

  const heading = context.dom.createElement('h2')
  heading.id = 'edit-profile-communities-heading'
  heading.classList.add('section-title')
  heading.textContent = communitiesHeadingText
  header.appendChild(heading)
  section.appendChild(header)

if (editableProfile) {
    let plusButtonDiv = context.dom.createElement('div')
    plusButtonDiv.classList.add('add-community-button-container')

    createAddButton(plusButtonDiv, context)
    section.appendChild(plusButtonDiv)
  }

  const attachmentOuter = section.appendChild(context.dom.createElement('table'))
  attachmentOuter.classList.add('edit-community-attachment-outer')
  const attachmentOne = attachmentOuter.appendChild(context.dom.createElement('tr'))
  const attachmentRight = attachmentOne.appendChild(context.dom.createElement('td'))
  const attachmentTable = attachmentRight.appendChild(context.dom.createElement('table'))
  attachmentTable.classList.add('attachmentTable', 'table', 'table-striped', 'table-hover')

  ;(attachmentOuter).refresh = refresh(context.dom, attachmentTable, me, editableProfile, ns.solid('community')) // Participate in downstream changes

  refresh(context.dom, attachmentTable, me, editableProfile, ns.solid('community'))

  function createAddButton(buttonContainer, context) {

    const plus = buttonContainer.appendChild(widgets.button(context.dom, GREEN_PLUS, 'Add a project or community', greenButtonHandler))
    const predicate = ns.solid('community')

    plus.setAttribute('class', 'add-button')
    plus.setAttribute('aria-label', 'Add a new community')
    const span = context.dom.createElement('span')
    span.textContent = 'Add a community or project' // for screen readers
    span.setAttribute('class','span')
    buttonContainer.appendChild(span)

    async function greenButtonHandler (_event) {
      const webid = await widgets.askName(context.dom, store, buttonContainer, predicate, undefined, 'WebID of')
      if (!webid) {
        return
      }

      try {
        new URL(webid)
      } catch {
        complain(buttonContainer, context, 'Not a URL')
        return
      }

      try {
        await store.fetcher.load(store.sym(webid))
      } catch {
        complain(buttonContainer, context, 'Not a valid WebID')
        return
      }

      if (!isAWebID(store.sym(webid))) {
        complain(buttonContainer, context, 'WebID does not seem to exist')
        return
      }

      return saveNewThing(webid, context, predicate)
        .then(() => {
          refresh(context.dom, attachmentTable, me, editableProfile, predicate) // Update the button state after adding a community
        })
        .catch((error) => {
          clearPreviousMessage(buttonContainer)
          complain(buttonContainer, context, error)
        })

    }
  }

  return section
}
