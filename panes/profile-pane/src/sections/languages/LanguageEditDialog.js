import { importCss } from '../../importCss.js'
import { getSharedDialogSaveButton, openInputDialog } from '../../ui/dialog.js'
import { html, render } from 'lit-html'
import 'solid-ui/components/button'
import 'solid-ui/components/combobox'
import { defineAsyncComboboxOptionsProvider, Combobox } from 'solid-ui/components/combobox'
// (type-only import removed: LanguageDetails, LanguageRow from './types.js')
importCss(new URL('../../styles/EditDialogs.css', import.meta.url))
importCss(new URL('../contactInfo/ContactInfoEditDialog.css', import.meta.url))
import { LiveStore, NamedNode } from 'rdflib'
// (type-only import removed: ViewerMode from '../../types.js')
import { applyRowFieldChange, applyRowSelectChange, deleteRow, summarizeRowOps } from '../shared/rowState.js'
import { hasNonEmptyText, sanitizeTextValue, toText } from '../../textUtils.js'
// (type-only import removed: MutationOps from '../shared/types.js')
import { processLanguageMutations } from './mutations.js'
import { bentoIcon, trashIcon } from '../../icons-svg/profileIcons.js'
import {
  deleteEntryButtonTitleText,
  dialogCancelLabelText,
  dialogSubmitLabelText,
  editLanguagesDialogTitleText,
  ownerLoginRequiredDialogMessageText,
  saveLanguageUpdatesFailedMessageText,
} from '../../texts.js'

const WIKIDATA_LANGUAGE_ENDPOINT = 'https://query.wikidata.org/sparql'
const LANGUAGE_OBJECT_URI_BASE = 'https://www.w3.org/ns/iana/language-code/'

const languagesProvider = defineAsyncComboboxOptionsProvider(async (rawQuery) => {
  const query = sanitizeLanguageFieldValue(rawQuery)

  if (query.length < 2) {
    return [{
        value: '',
        label: 'Type at least 2 characters to search',
        selectable: false
    }]
  }

  const params = new URLSearchParams({
    query: buildLanguageSearchQuery(query),
    format: 'json'
  })

  try {
    const response = await fetch(`${WIKIDATA_LANGUAGE_ENDPOINT}?${params.toString()}`, {
      headers: { Accept: 'application/sparql-results+json, application/json' }
    })
    if (!response.ok) return []

    const payload = await response.json()
    const bindings = Array.isArray(payload?.results?.bindings) ? payload.results.bindings : []
    const seen = new Set()

    return bindings
      .map((binding) => {
        const code = normalizeLanguageCode(preferredBindingValue(binding, 'subject'))

        return {
          code,
          value: buildLanguagePublicId(code),
          label: sanitizeLanguageFieldValue(preferredBindingValue(binding, 'name') || code)
        }
    })
    .filter((item) => {
      if (!item.label || !item.value || item.code.length !== 2) return false
      const key = item.value.toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  } catch {
    return []
  }
})

function sanitizeLanguageFieldValue(value) {
  return sanitizeTextValue(value)
}

function rowHasContent(row) {
  return [
    row.name,
    row.publicId,
    row.proficiency
  ].some(hasNonEmptyText)
}

function normalizeLanguageCode(value) {
  return (value || '').trim().toLowerCase()
}

function escapeSparqlRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function buildLanguageSearchQuery(name) {
  const escapedName = escapeSparqlRegex(name)
  return `SELECT ?item ?subject ?name WHERE {
    ?item wdt:P305 ?subject .
    OPTIONAL {
      ?item rdfs:label ?name .
      FILTER(langMatches(lang(?name), "en"))
    }
    FILTER regex(?name, "${escapedName}", "i")
    FILTER regex(?subject, "^..$", "i")
  } LIMIT 12`
}

function buildLanguagePublicId(subjectValue) {
  const value = (subjectValue || '').trim()
  if (!value) return ''
  if (value.startsWith('http://') || value.startsWith('https://')) return value
  return `${LANGUAGE_OBJECT_URI_BASE}${normalizeLanguageCode(value)}`
}

function preferredBindingValue(binding, key) {
  const value = binding?.[key]?.value
  return typeof value === 'string' ? value : ''
}

function initializeLanguageComboboxes(form, rows) {
  const comboboxElements = form.querySelectorAll('solid-ui-combobox[data-language-row-index]')

  comboboxElements.forEach((comboboxElement) => {
    const rowIndex = Number(comboboxElement.dataset.languageRowIndex)
    if (Number.isNaN(rowIndex)) return

    const row = rows[rowIndex]

    comboboxElement.optionsFallback = row?.publicId && row?.name
        ? [{ label: row.name, value: row.publicId }]
        : []
    comboboxElement.asyncOptionsProvider = languagesProvider
    comboboxElement.value = row?.publicId || ''
  })
}

function toFormState(details) {
  const rows = (details || [])
    .map((detail) => ({
      name: sanitizeLanguageFieldValue(toText(detail.name)),
      publicId: sanitizeLanguageFieldValue(toText(detail.publicId)),
      proficiency: sanitizeLanguageFieldValue(toText(detail.proficiency)),
      entryNode: toText(detail.entryNode),
      status: toText(detail.entryNode) ? 'existing' : 'new'
    }))
    .filter((row) => Boolean(row.name || row.entryNode || row.proficiency || row.publicId))

  return {
    languages: rows.length ? rows : [{ name: '', publicId: '', proficiency: '', entryNode: '', status: 'new' }],
    initialExistingOrder: [],
  }
}

function hasOrderChanged(rows, initialExistingOrder) {
  const currentExistingOrder = rows
    .filter((row) => row.status !== 'deleted' && Boolean((row.entryNode || '').trim()))
    .map((row) => (row.entryNode || '').trim())

  if (currentExistingOrder.length !== initialExistingOrder.length) return true

  for (let i = 0; i < currentExistingOrder.length; i++) {
    if (currentExistingOrder[i] !== initialExistingOrder[i]) return true
  }

  return false
}

function validateLanguagesBeforeSave(rows) {
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    if (!row || row.status === 'deleted') continue
    if (!hasNonEmptyText(row.name)) continue
    if (!hasNonEmptyText(row.publicId)) {
      return `Language ${i + 1}: please choose a language from the suggestions list.`
    }
  }

  return null
}

function hasInvalidLanguageSelection(rows) {
  return rows.some((row) => {
    if (!row || row.status === 'deleted') return false
    if (!hasNonEmptyText(row.name)) return false
    return !hasNonEmptyText(row.publicId)
  })
}

function updateLanguagesSubmitEnabled(rows) {
  const submitButton = getSharedDialogSaveButton(document)
  if (!submitButton) return
  submitButton.disabled = hasInvalidLanguageSelection(rows)
}

function focusLanguageField(form, selector) {
  const nextField = form.querySelector(selector)
  if (!nextField || typeof nextField.focus !== 'function') return

  if (typeof nextField.scrollIntoView === 'function') {
    nextField.scrollIntoView({ block: 'start', behavior: 'auto' })
  }
  const comboboxHost = nextField.tagName === 'SOLID-UI-COMBOBOX'
    ? (nextField)
    : null
  const comboboxInput = comboboxHost
    ? comboboxHost.shadowRoot?.querySelector('input')
    : null
  const focusTarget = comboboxInput || nextField
  focusTarget.focus()
  if (focusTarget instanceof HTMLInputElement) {
    const caretPosition = 0
    focusTarget.setSelectionRange(caretPosition, caretPosition)
    focusTarget.scrollLeft = 0
    requestAnimationFrame(() => {
      focusTarget.scrollLeft = 0
    })
  }

  if (comboboxHost?._closePopup) {
    requestAnimationFrame(() => {
      comboboxHost._closePopup?.()
    })
  }
}

function renderLanguageInputRow({
  rows,
  index,
  displayIndex,
  onDelete,
  onDragStart,
  onDragEnter,
  onDragOver,
  onDrop,
  onDragEnd,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  isDropTarget
}) {
  const row = rows[index]
  const label = `Language ${displayIndex + 1}`
  const proficiencyLabel = `Language Proficiency ${displayIndex + 1}`
  const proficiencyInputName = `proficiency-${index}`
  const proficiencySelectId = `proficiency-${index}`

  const handleLanguageChange = (field) => (event) => {
    if (!rows[index] || !event.detail.option) return

    applyRowFieldChange(rows[index], field, sanitizeLanguageFieldValue(event.detail.option.label), rowHasContent)
    rows[index].publicId = String(event.detail.option.value)
    updateLanguagesSubmitEnabled(rows)
  }

  const handleProficiencyInput = (e) => {
    const target = e.target
    const nextType = target.value
    if (rows[index]) {
      applyRowSelectChange(rows[index], 'proficiency', nextType)
      updateLanguagesSubmitEnabled(rows)
    }
  }

  const handleDelete = (event) => {
    event.preventDefault()
    onDelete()
  }

  return html`
    <div
      class="profile-edit-dialog__row profile-edit-dialog__row--language ${isDropTarget ? 'profile-edit-dialog__row--drop-target' : ''}"
      data-language-reorder-index=${String(index)}
      @dragenter=${() => onDragEnter(index)}
      @dragover=${(event) => onDragOver(event, index)}
      @drop=${(event) => onDrop(event, index)}
    >
      <solid-ui-button
        class="profile-edit-dialog__drag-handle"
        variant="ghost"
        aria-label=${`Reorder language ${displayIndex + 1}`}
        title="Drag to reorder"
        draggable="true"
        @dragstart=${(event) => onDragStart(event, index)}
        @dragend=${() => onDragEnd()}
        @pointerdown=${(event) => onPointerDown(event, index)}
        @pointermove=${(event) => onPointerMove(event)}
        @pointerup=${(event) => onPointerUp(event)}
        @pointercancel=${(event) => onPointerCancel(event)}
      >
        <span slot="icon" aria-hidden="true">${bentoIcon}</span>
      </solid-ui-button>
      <label aria-label=${`${label} Language`} class="label profile-edit-dialog__field profile-edit-dialog__field--language-name">
        <solid-ui-combobox
          select-only
          aria-label=${`${label} Language`}
          data-language-row-index=${String(index)}
          placeholder="Language"
          @change=${handleLanguageChange('name')}
        ></solid-ui-combobox>
        <small class="profile-edit-dialog__input-help-text">Type to search and select one language suggestion.</small>
      </label>
      <label aria-label=${proficiencyLabel} class="label profile-edit-dialog__field-type profile-edit-dialog__field-type--language-proficiency" hidden>
        <select name=${proficiencyInputName} id=${proficiencySelectId} @change=${handleProficiencyInput} .value=${row?.proficiency || ''}>
          <option value="Basic">Basic</option>
          <option value="Intermediate">Intermediate</option>
          <option value="Fluent">Fluent</option>
        </select>
      </label>
      <div class="profile-edit-dialog__actions profile-edit-dialog__actions--edge profile-edit-dialog__actions--language">
        <solid-ui-button
          variant="ghost"
          class="profile-edit-dialog__delete-button"
          aria-label=${`Delete language ${displayIndex + 1}`}
          title=${deleteEntryButtonTitleText}
          @click=${handleDelete}
        >
          <span slot="icon" class="profile-edit-dialog__delete-icon" aria-hidden="true">${trashIcon}</span>
        </solid-ui-button>
      </div>
    </div>
  `
}

function renderLanguageSection(
  rows,
  onAddRow
) {
  let dragSourceIndex = null
  let dropTargetIndex = null
  let touchPointerId = null

  const reorderRows = (from, to) => {
    if (from === to) return
    const row = rows[from]
    if (!row) return
    rows.splice(from, 1)
    rows.splice(to, 0, row)
  }

  const handleDragStart = (event, index) => {
    dragSourceIndex = index
    dropTargetIndex = index

    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move'
      event.dataTransfer.setData('text/plain', String(index))
    }
  }

  const handleDragEnter = (index) => {
    if (dragSourceIndex === null) return
    dropTargetIndex = index
  }

  const handleDragOver = (event, index) => {
    event.preventDefault()
    if (dragSourceIndex !== null) {
      dropTargetIndex = index
    }
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move'
    }
  }

  const handleDrop = (event, index) => {
    event.preventDefault()
    const transferIndex = event.dataTransfer?.getData('text/plain')
    const sourceIndex = dragSourceIndex ?? (transferIndex ? Number(transferIndex) : null)
    if (sourceIndex === null || Number.isNaN(sourceIndex)) return
    reorderRows(sourceIndex, index)
    dragSourceIndex = null
    dropTargetIndex = null
    onAddRow()
  }

  const handleDragEnd = () => {
    dragSourceIndex = null
    dropTargetIndex = null
  }

  const updateTouchDropTarget = (event) => {
    const dom = (event.currentTarget)?.ownerDocument || document
    const target = (dom.elementFromPoint(event.clientX, event.clientY))
      ?.closest('[data-language-reorder-index]')
    if (!target) return

    const nextIndex = Number(target.dataset.languageReorderIndex)
    if (!Number.isNaN(nextIndex)) {
      dropTargetIndex = nextIndex
    }
  }

  const handlePointerDown = (event, index) => {
    if (event.pointerType !== 'touch') return

    event.preventDefault()
    dragSourceIndex = index
    dropTargetIndex = index
    touchPointerId = event.pointerId
    ;(event.currentTarget)?.setPointerCapture?.(event.pointerId)
  }

  const handlePointerMove = (event) => {
    if (event.pointerType !== 'touch' || touchPointerId !== event.pointerId || dragSourceIndex === null) return

    event.preventDefault()
    updateTouchDropTarget(event)
  }

  const handlePointerUp = (event) => {
    if (event.pointerType !== 'touch' || touchPointerId !== event.pointerId) return

    event.preventDefault()
    updateTouchDropTarget(event)
    const sourceIndex = dragSourceIndex
    const targetIndex = dropTargetIndex
    ;(event.currentTarget)?.releasePointerCapture?.(event.pointerId)
    touchPointerId = null
    dragSourceIndex = null
    dropTargetIndex = null

    if (sourceIndex === null || targetIndex === null || sourceIndex === targetIndex) return

    reorderRows(sourceIndex, targetIndex)
    onAddRow()
  }

  const handlePointerCancel = (event) => {
    if (event.pointerType !== 'touch' || touchPointerId !== event.pointerId) return

    ;(event.currentTarget)?.releasePointerCapture?.(event.pointerId)
    touchPointerId = null
    dragSourceIndex = null
    dropTargetIndex = null
  }

  const visibleRows = rows
    .map((row, index) => ({ row, index }))
    .filter(({ row }) => row.status !== 'deleted')

  return html`
    <section class="profile-edit-dialog__section" aria-label="Languages">
      <fieldset>
        <legend class="sr-only">Language entries</legend>
        ${visibleRows.map(({ index }, displayIndex) => renderLanguageInputRow({
          rows,
          index,
          displayIndex,
          onDragStart: handleDragStart,
          onDragEnter: handleDragEnter,
          onDragOver: handleDragOver,
          onDrop: handleDrop,
          onDragEnd: handleDragEnd,
          onPointerDown: handlePointerDown,
          onPointerMove: handlePointerMove,
          onPointerUp: handlePointerUp,
          onPointerCancel: handlePointerCancel,
          isDropTarget: dropTargetIndex === index,
          onDelete: () => {
            deleteRow(rows, index)
            onAddRow()
          }
        }))}
      </fieldset>
    </section>
  `
}

function renderLanguageEditTemplate(
  form,
  formState,
  viewerMode,
  options = {}
) {
  const rerender = (nextOptions = {}) => renderLanguageEditTemplate(form, formState, viewerMode, nextOptions)

  render(html`
    ${renderLanguageSection(formState.languages, rerender)}
    ${viewerMode !== 'owner'
      ? html`<p class="profile-edit-dialog__login-message">${ownerLoginRequiredDialogMessageText}</p>`
      : null}
  `, form)

  initializeLanguageComboboxes(form, formState.languages)
  updateLanguagesSubmitEnabled(formState.languages)

  if (options.focusSelector) {
    focusLanguageField(form, options.focusSelector)
  }
}

function createLanguageEditForm(details, viewerMode) {
  const form = document.createElement('form')
  form.classList.add('profile__edit-form')

  const formState = toFormState(details)
  formState.initialExistingOrder = formState.languages
    .filter((row) => Boolean((row.entryNode || '').trim()))
    .map((row) => (row.entryNode || '').trim())
  renderLanguageEditTemplate(form, formState, viewerMode)

  const addRow = () => {
    formState.languages.unshift({
      name: '',
      publicId: '',
      proficiency: '',
      entryNode: '',
      status: 'new'
    })
    renderLanguageEditTemplate(form, formState, viewerMode, { focusSelector: '[data-language-row-index="0"]' })
  }

  return { form, formState, addRow }
}

export async function createLanguageEditDialog(
  event,
  store,
  subject,
  languages,
  viewerMode,
  onSaved
) {
  const dom = (event.currentTarget)?.ownerDocument || document
  const { form, formState, addRow } = createLanguageEditForm(languages, viewerMode)

  const result = await openInputDialog({
    title: editLanguagesDialogTitleText,
    dom,
    form,
    onOpen: () => focusLanguageField(form, '[data-language-row-index="0"]'),
    shouldCloseWithoutSave: () => {
      const ops = summarizeRowOps(formState.languages, rowHasContent)
      const orderChanged = hasOrderChanged(formState.languages, formState.initialExistingOrder)
      return ops.create.length === 0 && ops.update.length === 0 && ops.remove.length === 0 && !orderChanged
    },
    headerAction: {
      type: 'button',
      label: '+ Add More',
      ariaLabel: 'Add another language',
      onClick: addRow
    },
    submitLabel: dialogSubmitLabelText,
    cancelLabel: dialogCancelLabelText,
    validate: () => {
      if (viewerMode !== 'owner') {
        return ownerLoginRequiredDialogMessageText
      }
      return validateLanguagesBeforeSave(formState.languages)
    },
    onSave: async () => {
      const languageOps = summarizeRowOps(formState.languages, rowHasContent)
      const plan = {
        create: languageOps.create,
        update: languageOps.update,
        remove: languageOps.remove
      }
      await processLanguageMutations(store, subject, plan, formState.languages)
    },
    formatSaveError: (error) => {
      return error instanceof Error ? error.message : saveLanguageUpdatesFailedMessageText
    }
  })

  if (!result) return

  if (onSaved) {
    await onSaved()
  }
}
