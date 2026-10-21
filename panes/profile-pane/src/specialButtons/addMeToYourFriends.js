import { importCss } from '../importCss.js'
import { html } from 'lit-html'
import 'solid-ui/components/button'

// (type-only import removed: DataBrowserContext from 'pane-registry')
import { authn } from 'solid-logic'
import { LiveStore, NamedNode, st } from 'rdflib'
import { ns } from 'solid-ui'
import {
  clearPreviousMessage, complain,
  mention
} from '../buttonsHelper.js'
import {
  addMeToYourFriendsButtonText, friendExistsAlreadyButtonText, friendExistsMessage, friendWasAddedSuccesMessage, logInAddMeToYourFriendsButtonText, userNotLoggedInErrorMessage
} from '../texts.js'
// (type-only import removed: ViewerMode from '../types.js')
import { ensureStandardMutationPrefixes } from '../sections/shared/rdfMutationHelpers.js'
importCss(new URL('./AddMeToYourFriends.css', import.meta.url))

let buttonContainer = document.createElement('section')

function setAddToFriendsButtonLabel(button, label) {
  const labelWrapper = button.ownerDocument.createElement('span')
  labelWrapper.className = 'profile__btn-friends-label profile__btn-friends-label--full'
  labelWrapper.textContent = label

  if (label === friendExistsAlreadyButtonText) {
    const shortLabelWrapper = button.ownerDocument.createElement('span')
    shortLabelWrapper.className = 'profile__btn-friends-label profile__btn-friends-label--short'
    shortLabelWrapper.setAttribute('aria-hidden', 'true')
    shortLabelWrapper.setAttribute('data-short-label-text', 'Friends')
    button.setAttribute('data-friends-short-label', 'true')
    button.setAttribute('aria-label', label)
    button.replaceChildren(labelWrapper, shortLabelWrapper)
    return
  }

  button.removeAttribute('data-friends-short-label')
  button.removeAttribute('aria-label')
  button.replaceChildren(labelWrapper)
}

const addMeToYourFriendsDiv = (
  subject,
  context,
  _viewerMode
) => {

  buttonContainer = context.dom.createElement('section')
  buttonContainer.setAttribute('class', 'profile-friends-button__section text-truncate text-center section-centered')
  buttonContainer.setAttribute('aria-labelledby', 'add-me-to-your-friends-button-section')
  buttonContainer.setAttribute('data-testid', 'button')

  // Add a visually hidden heading for accessibility
  const heading = context.dom.createElement('h3')
  heading.setAttribute('id', 'add-me-to-your-friends-button-section')
  heading.setAttribute('class', 'sr-only')
  heading.textContent = 'Add me to your friends actions'
  buttonContainer.appendChild(heading)

  const button = createAddMeToYourFriendsButton(subject, context)
  button.classList.add('profile__action-button', 'profile__btn-friends', 'flex-center')
  buttonContainer.appendChild(button)
  return html`${buttonContainer}`
}

const createAddMeToYourFriendsButton = (
  subject,
  context
) => {
  let label = addMeToYourFriendsButtonText
  const button = context.dom.createElement('solid-ui-button')
  button.setAttribute('variant', 'secondary')
  setAddToFriendsButtonLabel(button, label)
  button.addEventListener('click', setButtonHandler)

  function setButtonHandler(event) {
    event.preventDefault()
    saveNewThing(subject, context, ns.foaf('knows'))
      .then(() => {
        clearPreviousMessage(buttonContainer)
        mention(buttonContainer, friendWasAddedSuccesMessage)
        refreshButton()
      })
      .catch((error) => {
        clearPreviousMessage(buttonContainer)
        //else UI.widgets.complain(buttonContainer, message); //displays an error message at the top of the window
        complain(buttonContainer, context, error)
      })
  }

  refreshButton()

  function refreshButton() {
    const me = authn.currentUser()
    const store = context.session.store

    if (checkIfAnyUserLoggedIn(me)) {
      button.disabled = false
      button.removeAttribute('disabled')
      checkIfThingExists(store, me, subject, ns.foaf('knows')).then((friendExists) => {
        const isMobileLayout = context.environment?.layout === 'mobile'

        if (friendExists) {
          //logged in and friend exists or friend was just added
          setAddToFriendsButtonLabel(button, friendExistsAlreadyButtonText)
          button.disabled = true
          button.setAttribute('disabled', 'true')
          buttonContainer.hidden = isMobileLayout
          buttonContainer.style.display = isMobileLayout ? 'none' : ''
        } else {
          //logged in and friend does not exist yet
          setAddToFriendsButtonLabel(button, addMeToYourFriendsButtonText)
          button.disabled = false
          button.removeAttribute('disabled')
          buttonContainer.hidden = false
          buttonContainer.style.display = ''
        }
      })
    } else {
      //not logged in — disable and indicate login is required
      setAddToFriendsButtonLabel(button, logInAddMeToYourFriendsButtonText)
      button.disabled = true
      button.setAttribute('disabled', 'true')
      buttonContainer.hidden = false
    }
  }

  return button
}

async function saveNewThing(
  subject,
  context,
  predicate
) {
  const me = authn.currentUser()
  const store = context.session.store

  if (checkIfAnyUserLoggedIn(me)) {
    if (!(await checkIfThingExists(store , me, subject, predicate))) {
      //if friend does not exist, we add her/him
      await store.fetcher.load(me)
      const updater = store.updater
      const toBeInserted = [st(me, predicate, subject, me.doc())]
      try {
        ensureStandardMutationPrefixes(store)
        await updater.update([], toBeInserted)
      } catch (error) {
        let errorMessage = error
        if (errorMessage.toString().includes('Unauthenticated'))
          errorMessage = userNotLoggedInErrorMessage
        throw new Error(errorMessage)
      }
    } else throw new Error(friendExistsMessage)
  } else throw new Error(userNotLoggedInErrorMessage)
}

function checkIfAnyUserLoggedIn(me) {
  if (me) return true
  else return false
}

async function checkIfThingExists(
  store,
  me,
  subject,
  predicate
) {
  await store.fetcher.load(me)
  if (store.whether(me, predicate, subject, me.doc()) === 0)
    return false
  else return true
}

export {
  addMeToYourFriendsDiv,
  createAddMeToYourFriendsButton,
  saveNewThing,
  checkIfThingExists
}
