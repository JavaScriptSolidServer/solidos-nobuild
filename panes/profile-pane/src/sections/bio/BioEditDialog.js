import { importCss } from '../../importCss.js'
import { openInputDialog } from '../../ui/dialog.js'
import { html, render } from 'lit-html'

importCss(new URL('../../styles/EditDialogs.css', import.meta.url))
import { LiveStore, NamedNode } from 'rdflib'
import { processBioMutations } from './mutations.js'
// (type-only import removed: ViewerMode from '../../types.js')
import { applyRowFieldChange, summarizeRowOps } from '../shared/rowState.js'
import { hasNonEmptyText, sanitizeTextValue, toText } from '../../textUtils.js'
import {
  dialogCancelLabelText,
  dialogSubmitLabelText,
  editBioDialogTitleText,
  ownerLoginRequiredDialogMessageText,
  saveBioUpdatesFailedMessageText
} from '../../texts.js'

function rowHasContent(row) {
  return hasNonEmptyText(row.description)
}

function toFormState(bioData) {
  const row = {
    description: sanitizeTextValue(toText(bioData?.description || '')),
    entryNode: toText(bioData?.entryNode || ''),
    status: toText(bioData?.entryNode || '') ? 'existing' : 'new'
  }

  return {
    bio: row
  }
}

function renderBioSection(bioRow, onChange) {
  const descriptionName = 'bio-description'
  const descriptionCounterId = 'bio-description-counter'
  const descriptionMaxLength = 2600
  const descriptionCount = (bioRow?.description || '').length

  const handleDescriptionInput = (event) => {
    const target = event.target
    const nextValue = sanitizeTextValue(target.value.slice(0, descriptionMaxLength))
    applyRowFieldChange(bioRow, 'description', nextValue, rowHasContent)
    onChange()
  }

  return html`
    <section class="profile-edit-dialog__section" aria-label="Bio editor">

      <label aria-label="Bio description" class="label profile-edit-dialog__bio-field-container">
        <span class="profile-edit-dialog__field-description">
          You can write about your years of experience, industry, or skills.
          People also talk about their achievements or previous job experiences.
        </span>
        <textarea
          class="profile-edit-dialog__textarea"
          name=${descriptionName}
          rows="5"
          .value=${bioRow?.description || ''}
          maxlength=${descriptionMaxLength}
          aria-describedby=${descriptionCounterId}
          data-contact-field="description"
          data-entry-node=${bioRow?.entryNode || ''}
          data-row-status=${bioRow?.status || 'n/a'}
          placeholder="Write a short bio"
          autocomplete="off"
          @input=${handleDescriptionInput}
        ></textarea>
        <small id=${descriptionCounterId} aria-live="polite">${descriptionCount}/${descriptionMaxLength}</small>
      </label>
    </section>
  `
}

function renderBioEditTemplate(form, formState, viewerMode) {
  const rerender = () => renderBioEditTemplate(form, formState, viewerMode)
  render(html`
    ${renderBioSection(formState.bio, rerender)}
    ${viewerMode !== 'owner'
      ? html`<p class="profile-edit-dialog__login-message">${ownerLoginRequiredDialogMessageText}</p>`
      : null}
  `, form)
}

function createBioEditForm(bioData, viewerMode) {
  const form = document.createElement('form')
  form.classList.add('profile__edit-form', 'profile__edit-form--bio')

  const formState = toFormState(bioData)
  renderBioEditTemplate(form, formState, viewerMode)

  return { form, formState }
}

export async function createBioEditDialog(
  event,
  store,
  subject,
  bioData,
  viewerMode,
  onSaved
) {
  const dom = (event.currentTarget)?.ownerDocument || document
  const { form, formState } = createBioEditForm(bioData, viewerMode)

  const result = await openInputDialog({
    title: editBioDialogTitleText,
    dom,
    form,
    headerAction: { type: 'none' },
    submitLabel: dialogSubmitLabelText,
    cancelLabel: dialogCancelLabelText,
    shouldCloseWithoutSave: () => {
      const bioOps = summarizeRowOps([formState.bio], rowHasContent)
      return bioOps.create.length === 0 && bioOps.update.length === 0 && bioOps.remove.length === 0
    },
    validate: () => {
      if (viewerMode !== 'owner') {
        return ownerLoginRequiredDialogMessageText
      }

      return null
    },
    onSave: async () => {
      const bioOps = summarizeRowOps([formState.bio], rowHasContent)
      await processBioMutations(store, subject, bioOps)
    },
    formatSaveError: (error) => {
      return error instanceof Error ? error.message : saveBioUpdatesFailedMessageText
    }
  })

  if (!result) return

  if (onSaved) {
    await onSaved()
  }
}
