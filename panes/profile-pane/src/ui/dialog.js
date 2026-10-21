import { importCss } from '../importCss.js'
importCss(new URL('./dialog.css', import.meta.url))
import 'solid-ui/components/button'
import { html, render } from 'lit-html'
import { closeIcon } from '../icons-svg/profileIcons.js'
import { createSpinner } from './spinner.js'
import { formatDisplayError } from '../utils/errorDisplay.js'

/* Copied from issue-pane, minor typescript adjustments */
/* Changed modal from div to dialog element */
let modalDialog = null

let scrollLockCount = 0
let previousHtmlOverflow = ''
let previousBodyOverflow = ''
let removeDocumentScrollGuard = null

function getEventTargetElement(target) {
  if (target instanceof HTMLElement) return target
  if (target instanceof Node) return target.parentElement
  return null
}

function getEventPath(event) {
  if (typeof event.composedPath === 'function') {
    return event.composedPath()
  }

  return event.target ? [event.target] : []
}

function isDialogScrollRegionTarget(event) {
  const path = getEventPath(event)
  const description = modalDialog?.querySelector('#modal-desc')

  if (description && path.includes(description)) {
    return true
  }

  if (modalDialog && path.includes(modalDialog)) {
    return true
  }

  const targetElement = getEventTargetElement(event.target)
  if (!targetElement || !modalDialog || !modalDialog.contains(targetElement)) {
    return false
  }

  return Boolean(targetElement.closest('#modal-desc'))
}

function installDocumentScrollGuard(dom) {
  if (removeDocumentScrollGuard) return

  const preventBackgroundScroll = (event) => {
    if (!isDialogScrollRegionTarget(event)) {
      event.preventDefault()
    }
  }

  dom.addEventListener('wheel', preventBackgroundScroll, { capture: true, passive: false })
  dom.addEventListener('touchmove', preventBackgroundScroll, { capture: true, passive: false })
  removeDocumentScrollGuard = () => {
    dom.removeEventListener('wheel', preventBackgroundScroll, true)
    dom.removeEventListener('touchmove', preventBackgroundScroll, true)
    removeDocumentScrollGuard = null
  }
}

function lockDocumentScroll(dom) {
  if (scrollLockCount === 0) {
    previousHtmlOverflow = dom.documentElement.style.overflow
    previousBodyOverflow = dom.body.style.overflow

    dom.documentElement.style.overflow = 'hidden'
    dom.body.style.overflow = 'hidden'
    installDocumentScrollGuard(dom)
  }

  scrollLockCount += 1
}

function unlockDocumentScroll(dom) {
  if (scrollLockCount === 0) return

  scrollLockCount -= 1
  if (scrollLockCount > 0) return

  dom.documentElement.style.overflow = previousHtmlOverflow
  dom.body.style.overflow = previousBodyOverflow
  removeDocumentScrollGuard?.()
}

function getDialogMountTarget(dom) {
  return dom.body
}

function isSolidUiButton(control) {
  return control?.tagName === 'SOLID-UI-BUTTON'
}

function setDialogActionDisabled(control, disabled) {
  if (!control) return
  control.disabled = disabled
  control.toggleAttribute('disabled', disabled)
}

function setDialogActionLabel(control, label) {
  if (!control) return

  if (isSolidUiButton(control)) {
    control.label = label
    control.setAttribute('label', label)
    control.textContent = label
    return
  }

  ;(control).textContent = label
}

export function getSharedDialogSaveButton(root) {
  return root.querySelector('#modal-buttons [data-dialog-primary="true"]')
}

export function getSharedDialogCancelButton(root) {
  return root.querySelector('#modal-buttons [data-cancel="true"]')
}

function ensureModalDialog (dom) {
  const mountTarget = getDialogMountTarget(dom)

  // if we previously created a dialog but it was removed from the document
  // (tests clear body), rebuild it. Checking presence ensures our reference
  // doesn't point at a detached element.
  if (modalDialog && dom.body.contains(modalDialog)) {
    if (modalDialog.parentElement !== mountTarget) {
      mountTarget.appendChild(modalDialog)
    }
    return modalDialog
  }

  modalDialog = null
  modalDialog = dom.createElement('dialog')
  modalDialog.id = 'profile-modal'
  modalDialog.setAttribute('aria-modal', 'true')
  modalDialog.setAttribute('aria-labelledby', 'modal-title')
  modalDialog.setAttribute('aria-describedby', 'modal-desc')

  modalDialog.innerHTML = `
    <div class="modal">
      <div class="modal-header flex-row align-center justify-between">
        <h2 id="modal-title"></h2>
        <div id="modal-header-action" class="flex-row align-center"></div>
      </div>
      <div id="modal-desc"></div>
      <section id="modal-error" class="modal__error-section" aria-live="assertive" aria-atomic="true" aria-hidden="true" role="alert" tabindex="-1" hidden></section>
      <div id="modal-buttons" class="flex-row align-center justify-end"></div>
      <div id="modal-saving-overlay" hidden></div>
    </div>
  `

  mountTarget.appendChild(modalDialog)
  return modalDialog
}

function getDialogElements (dialog) {
  return {
    dialog,
    title: dialog.querySelector('#modal-title'),
    headerAction: dialog.querySelector('#modal-header-action'),
    description: dialog.querySelector('#modal-desc'),
    error: dialog.querySelector('#modal-error'),
    buttons: dialog.querySelector('#modal-buttons'),
    savingOverlay: dialog.querySelector('#modal-saving-overlay')
  }
}

function clearModalError(elements) {
  elements.error.textContent = ''
  elements.error.setAttribute('aria-hidden', 'true')
  elements.error.hidden = true
}

function setModalError(elements, error, fallbackMessage) {
  elements.error.textContent = formatDisplayError(error, fallbackMessage)
  elements.error.setAttribute('aria-hidden', 'false')
  elements.error.hidden = false
}

function openDialogElement (dialog) {
  lockDocumentScroll(dialog.ownerDocument)

  if (typeof dialog.showModal === 'function') {
    try {
      if (!dialog.open) dialog.showModal()
      return
    } catch {
      // Fall back for jsdom or partial dialog implementations.
    }
  }

  dialog.setAttribute('open', '')
}

function closeDialogElement (dialog) {
  try {
    if (typeof dialog.close === 'function' && dialog.open) {
      dialog.close()
      return
    }

    dialog.removeAttribute('open')
  } finally {
    unlockDocumentScroll(dialog.ownerDocument)
  }
}

function isMobileDialogLayout(dom) {
  return Boolean(dom.querySelector('[data-layout=\'mobile\']'))
}

function isFocusableElement(element) {
  if (element.hasAttribute('disabled')) return false
  if (element.getAttribute('aria-hidden') === 'true') return false
  if (element.getAttribute('hidden') !== null) return false
  if (element.tabIndex < 0) return false
  return true
}

function findPreferredInitialFocusTarget(container) {
  const focusableControls = container.querySelectorAll([
    'input:not([type="hidden"]):not([disabled])',
    'textarea:not([disabled])',
    'select:not([disabled])',
    'solid-ui-select:not([disabled])',
    'solid-ui-combobox:not([disabled])',
    '[contenteditable="true"]',
    'button:not([disabled])',
    'solid-ui-button:not([disabled])',
    '[tabindex]:not([tabindex="-1"])'
  ].join(','))

  for (const match of focusableControls) {
    if (match instanceof HTMLElement && isFocusableElement(match)) return match
  }

  return null
}

function focusInitialDialogTarget(dialog, description, buttons) {
  if (isMobileDialogLayout(dialog.ownerDocument)) {
    const activeElement = dialog.ownerDocument.activeElement
    if (activeElement && dialog.contains(activeElement)) {
      activeElement.blur()
    }
    return
  }

  const initialTarget = findPreferredInitialFocusTarget(description)
  if (initialTarget) {
    initialTarget.focus()
    if (initialTarget instanceof HTMLInputElement || initialTarget instanceof HTMLTextAreaElement) {
      initialTarget.select()
    }
    return
  }

  const firstButton = findPreferredInitialFocusTarget(buttons)
  if (firstButton) {
    firstButton.focus()
  }
}

function collectFormValues (form) {
  const data = new FormData(form)
  const values = {}
  data.forEach((value, key) => {
    values[key] = String(value)
  })
  return values
}

function openModal ({
  title,
  message,
  buttons,
  headerAction,
  dom
}) {
  const dialog = ensureModalDialog(dom)
  const elements = getDialogElements(dialog)

  openDialogElement(dialog)

  elements.title.textContent = title || ''
  elements.description.innerHTML = ''
  if (typeof message === 'string') {
    elements.description.textContent = message
  } else {
    elements.description.appendChild(message)
  }

  elements.buttons.innerHTML = ''
  clearModalError(elements)

  return new Promise((resolve) => {
    const finish = (value) => {
      closeModal(value)
      resolve(value)
    }

    const requestCancel = () => {
      const cancelBtn = getSharedDialogCancelButton(dialog)
      if (cancelBtn) {
        cancelBtn.click()
        return
      }

      finish(false)
    }

    dialog.oncancel = (event) => {
      event.preventDefault()
      requestCancel()
    }

    elements.headerAction.innerHTML = ''
    const resolvedHeaderAction = headerAction || { type: 'close'}
    if (resolvedHeaderAction.type === 'close') {
      const closeButton = dom.createElement('solid-ui-button')
      closeButton.setAttribute('variant', 'ghost')
      closeButton.setAttribute('aria-label', 'Close dialog')
      const iconSlot = dom.createElement('span')
      iconSlot.setAttribute('slot', 'icon')
      render(closeIcon, iconSlot)
      closeButton.appendChild(iconSlot)
      closeButton.onclick = () => requestCancel()
      elements.headerAction.appendChild(closeButton)
    } else if (resolvedHeaderAction.type === 'button') {
      const actionButton = dom.createElement('solid-ui-button')
      actionButton.setAttribute('variant', 'tertiary')
      actionButton.className = resolvedHeaderAction.className || ''
      actionButton.textContent = resolvedHeaderAction.label
      actionButton.setAttribute('label', resolvedHeaderAction.label)
      actionButton.setAttribute('aria-label', resolvedHeaderAction.ariaLabel || resolvedHeaderAction.label)
      actionButton.onclick = async () => {
        if (resolvedHeaderAction.onClick) {
          await resolvedHeaderAction.onClick()
        }
      }
      elements.headerAction.appendChild(actionButton)
    }

    buttons.forEach((btn) => {
      const b = dom.createElement('solid-ui-button')
      b.setAttribute('label', btn.label)
      b.setAttribute('variant', btn.primary ? 'primary' : 'secondary')
      b.textContent = btn.label
      if (btn.primary) {
        b.setAttribute('data-dialog-primary', 'true')
      }
      if (btn.cancel) {
        b.setAttribute('data-cancel', 'true')
      }
      b.addEventListener('click', async () => {
        if (btn.beforeClose) {
          const shouldClose = await btn.beforeClose()
          if (!shouldClose) return
        }
        finish(btn.value)
      })
      elements.buttons.appendChild(b)
    })

    const scheduleInitialFocus = dom.defaultView?.requestAnimationFrame
      ? (callback) => dom.defaultView?.requestAnimationFrame(() => callback())
      : (callback) => setTimeout(callback, 0)

    scheduleInitialFocus(() => {
      focusInitialDialogTarget(dialog, elements.description, elements.buttons)
    })
  })
}

function closeModal (_result) {
  if (modalDialog) {
    closeDialogElement(modalDialog)
    modalDialog.oncancel = null
    const headerActionButton = modalDialog.querySelector('#modal-header-action button')
    if (headerActionButton) headerActionButton.onclick = null
  }
}

export function closeSharedDialog() {
  closeModal(null)
}

export function alertDialog (message, title = 'Information', dom) {
  return openModal({
    title,
    message,
    buttons: [{ label: 'OK', value: true, primary: true }],
    dom
  })
}

function updateSavingUI (dialog, submitLabel, isSaving) {
  const elements = getDialogElements(dialog)
  const saveButton = getSharedDialogSaveButton(dialog)
  const cancelButton = getSharedDialogCancelButton(dialog)

  dialog.classList.toggle('modal--saving', isSaving)
  dialog.setAttribute('aria-busy', String(isSaving))
  elements.description.toggleAttribute('inert', isSaving)

  if (isSaving) {
    const activeElement = dialog.ownerDocument.activeElement
    if (activeElement && dialog.contains(activeElement)) {
      activeElement.blur()
    }
  }

  if (saveButton) {
    setDialogActionDisabled(saveButton, isSaving)
    saveButton.setAttribute('aria-busy', String(isSaving))
    setDialogActionLabel(saveButton, submitLabel)
  }

  if (cancelButton) {
    setDialogActionDisabled(cancelButton, isSaving)
  }

  elements.savingOverlay.hidden = !isSaving
  if (isSaving) {
    render(html`
      <div class="modal__saving-indicator inline-flex-row justify-center" aria-live="polite" aria-label="Saving changes">
        ${createSpinner()}
      </div>
    `, elements.savingOverlay)
  } else {
    render(html``, elements.savingOverlay)
  }
}

export function setSharedDialogSavingState (dom, isSaving, submitLabel = 'Saving Changes') {
  const dialog = ensureModalDialog(dom)
  updateSavingUI(dialog, submitLabel, isSaving)
}

/* Function below generated by AI Model: GPT-5.3-Codex */
/* Prompt: write me a reusable function to open a dialog with a form and return the form values on submit.
The function should also support validation and display error messages in the dialog.
It should reuse the OpenModal function for consistency. Done in 2 passes */
export function openInputDialog (options) {
  const submitLabel = options.submitLabel || 'Save Changes'
  const cancelLabel = options.cancelLabel || 'Cancel'
  const dialog = ensureModalDialog(options.dom)
  const elements = getDialogElements(dialog)
  const submitProxy = options.dom.createElement('button')
  submitProxy.type = 'submit'
  submitProxy.hidden = true
  submitProxy.style.display = 'none'
  submitProxy.setAttribute('aria-hidden', 'true')
  submitProxy.tabIndex = -1
  options.form.appendChild(submitProxy)

  const handleSubmit = (event) => {
    event.preventDefault()
    const saveButton = getSharedDialogSaveButton(dialog)
    saveButton?.click()
  }

  options.form.addEventListener('submit', handleSubmit)

  const dialogPromise = openModal({
    title: options.title,
    message: options.form,
    headerAction: options.headerAction,
    buttons: [
      { label: cancelLabel, value: null, cancel: true },
      {
        label: submitLabel,
        value: 'save',
        primary: true,
        beforeClose: async () => {
          clearModalError(elements)

          if (options.shouldCloseWithoutSave && await options.shouldCloseWithoutSave()) {
            return true
          }

          if (options.validate) {
            const validationMessage = await options.validate()
            if (validationMessage) {
              setModalError(elements, validationMessage)
              return false
            }
          }

          if (!options.onSave) return true

          try {
            updateSavingUI(dialog, submitLabel, true)

            await options.onSave()
            return true
          } catch (error) {
            updateSavingUI(dialog, submitLabel, false)
            const fallback = options.formatSaveError ? options.formatSaveError(error) : undefined
            setModalError(elements, error, fallback)
            return false
          }
        }
      }
    ],
    dom: options.dom
  })

  const scheduleOpenCallback = options.dom.defaultView?.requestAnimationFrame
    ? (callback) => options.dom.defaultView?.requestAnimationFrame(() => callback())
    : (callback) => setTimeout(callback, 0)

  if (options.onOpen) {
    scheduleOpenCallback(options.onOpen)
  }

  elements.buttons.hidden = Boolean(options.hideFooterButtons)

  return dialogPromise
    .then((result) => {
      if (result !== 'save') return null
      return collectFormValues(options.form)
    })
    .finally(() => {
      elements.buttons.hidden = false
      updateSavingUI(dialog, submitLabel, false)
      options.form.removeEventListener('submit', handleSubmit)
      submitProxy.remove()
    })
}
