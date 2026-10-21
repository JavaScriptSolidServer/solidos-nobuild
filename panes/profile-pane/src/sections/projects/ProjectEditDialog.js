import { importCss } from '../../importCss.js'
import { getSharedDialogSaveButton, openInputDialog } from '../../ui/dialog.js'
import { html, render } from 'lit-html'
import 'solid-ui/components/button'
// (type-only import removed: ProjectDetails, ProjectRow from './types.js')
importCss(new URL('../../styles/EditDialogs.css', import.meta.url))
import { LiveStore, NamedNode } from 'rdflib'
// (type-only import removed: ViewerMode from '../../types.js')
import { applyRowFieldChange, summarizeRowOps } from '../shared/rowState.js'
import { hasNonEmptyText, sanitizeTextValue } from '../../textUtils.js'
// (type-only import removed: MutationOps from '../shared/types.js')
import { processProjectsMutations } from './mutations.js'
import { pasteIcon } from '../../icons-svg/profileIcons.js'
import {
  editProjectsDialogTitleText,
  ownerLoginRequiredDialogMessageText,
  pasteEntryButtonTitleText,
} from '../../texts.js'

function sanitizeProjectFieldValue(value) {
  return sanitizeTextValue(value)
}

function isValidProjectUrl(value) {
  const text = sanitizeProjectFieldValue(value)
  if (!text) return false

  try {
    const parsed = new URL(text)
    return (
      parsed.protocol === 'https:' &&
      parsed.pathname === '/profile/card' &&
      parsed.hash === '#me'
    )
  } catch {
    return false
  }
}

function rowHasContent(row) {
  return [row.url, row.entryNode].some(hasNonEmptyText)
}

async function pasteWebIdIntoRow(row) {
  const clipboardText = await navigator.clipboard.readText()
  const url = sanitizeProjectFieldValue(clipboardText)
  if (!url) return ''

  applyRowFieldChange(row, 'url', url, rowHasContent)

  return url
}

function toFormState(_details) {
  return {
    project: { url: '', entryNode: '', status: 'new' }
  }
}

function validateProjectBeforeSave(row) {
  if (!hasNonEmptyText(row.url)) {
    return 'WebID is required.'
  }
  if (!isValidProjectUrl(row.url)) {
    return 'Please enter a valid WebID in the form https://example.com/profile/card#me.'
  }
  return null
}

function renderProjectInputRow(row, onChange) {
  const projectUrl = 'project-0'

  const handleUrlInput = (e) => {
    const target = e.target
    const nextValue = sanitizeProjectFieldValue(target.value)
    applyRowFieldChange(row, 'url', nextValue, rowHasContent)
  }

  const handlePaste = async (event) => {
    event.preventDefault()

    try {
      const url = await pasteWebIdIntoRow(row)
      onChange()

      if (!isValidProjectUrl(url)) return

      const dom = (event.currentTarget)?.ownerDocument || document
      const saveButton = getSharedDialogSaveButton(dom)
      saveButton?.click()
    } catch {
      // Clipboard access may fail due to browser permissions; keep dialog usable.
    }
  }

  return html`
    <div class="profile-edit-dialog__row profile-edit-dialog__row--project">
      <label aria-label="Project or community WebID" class="label profile-edit-dialog__field profile-edit-dialog__field--full">
      <div class="profile-edit-dialog__input-wrap">
          <input
            class="input profile-edit-dialog__input--with-action"
            type="text"
            name=${projectUrl}
            .value=${row?.url || ''}
            required
            data-contact-field="url"
            data-entry-node=${row?.entryNode || ''}
            data-row-status=${row?.status || 'n/a'}
            placeholder="Type or paste project/community WebID here"
            autocomplete="off"
            inputmode="text"
            @input=${handleUrlInput}
          />
          <solid-ui-button
            variant="tertiary"
            class="profile-edit-dialog__paste-button"
            aria-label="Paste project or community URL from clipboard"
            title=${pasteEntryButtonTitleText}
            @click=${handlePaste}
          >
            <span slot="left-icon" class="profile-edit-dialog__paste-icon" aria-hidden="true">${pasteIcon}</span>
            Paste
          </solid-ui-button>
        </div>
      </label>
    </div>
  `
}

function renderProjectsEditTemplate(form, formState, viewerMode) {
  const rerender = () => renderProjectsEditTemplate(form, formState, viewerMode)

  render(html`
    ${renderProjectInputRow(formState.project, rerender)}
    ${viewerMode !== 'owner'
      ? html`<p class="profile-edit-dialog__login-message">${ownerLoginRequiredDialogMessageText}</p>`
      : null}
  `, form)
}

function createProjectsEditForm(details, viewerMode) {
  const form = document.createElement('form')
  form.classList.add('profile__edit-form')
  form.classList.add('profile__edit-form--projects')

  const formState = toFormState(details)
  renderProjectsEditTemplate(form, formState, viewerMode)

  return { form, formState }
}

export async function createProjectsEditDialog(
  event,
  store,
  subject,
  projects,
  viewerMode,
  onSaved
) {
  const dom = (event.currentTarget)?.ownerDocument || document
  const { form, formState } = createProjectsEditForm(projects, viewerMode)

  const dialogPromise = openInputDialog({
    title: editProjectsDialogTitleText,
    dom,
    form,
    headerAction: { type: 'close' },
    shouldCloseWithoutSave: () => !hasNonEmptyText(formState.project.url) && !hasNonEmptyText(formState.project.entryNode),
    validate: () => {
      if (viewerMode !== 'owner') {
        return ownerLoginRequiredDialogMessageText
      }
      return validateProjectBeforeSave(formState.project)
    },
    onSave: async () => {
      const projectOps = summarizeRowOps([formState.project], rowHasContent)
      const plan = {
        create: projectOps.create,
        update: projectOps.update,
        remove: projectOps.remove
      }
      await processProjectsMutations(store, subject, plan)
    },
    formatSaveError: (error) => {
      return error instanceof Error ? error.message : String(error)
    }
  })

  let result = null
  result = await dialogPromise

  if (!result) return

  if (onSaved) {
    await onSaved()
  }
}
