// (type-only import removed: DataBrowserContext from 'pane-registry')
import { widgets } from 'solid-ui'
import { NamedNode } from 'rdflib'
import { formatDisplayError } from './utils/errorDisplay.js'

function complain(
  buttonContainer,
  context,
  error
) {
  const errorBlock = widgets.errorMessageBlock(context.dom, formatDisplayError(error))
  errorBlock.setAttribute('role', 'alert')
  errorBlock.setAttribute('aria-live', 'assertive')
  errorBlock.setAttribute('tabindex', '0')

  // Focus the error message for screen readers
  setTimeout(() => {
    errorBlock.focus()
  }, 100)

  buttonContainer.appendChild(errorBlock)
}

function mention(buttonContainer, message) {
  const positiveFrontendMessageDiv = document.createElement('div')
  positiveFrontendMessageDiv.setAttribute('role', 'status')
  positiveFrontendMessageDiv.setAttribute('aria-live', 'polite')
  positiveFrontendMessageDiv.setAttribute('tabindex', '0')
  positiveFrontendMessageDiv.classList.add('profile__action-button', 'licOkay')
  positiveFrontendMessageDiv.innerHTML = message

  // Focus the success message for screen readers
  setTimeout(() => {
    positiveFrontendMessageDiv.focus()
  }, 100)

  buttonContainer.appendChild(positiveFrontendMessageDiv)
}

function clearPreviousMessage(buttonContainer) {
  while (buttonContainer.childNodes.length > 2) {
    buttonContainer.removeChild(buttonContainer.lastChild)
  }
}

function checkIfAnyUserLoggedIn(me) {
  if (me) return true
  else return false
}

export { complain, mention, clearPreviousMessage, checkIfAnyUserLoggedIn }
