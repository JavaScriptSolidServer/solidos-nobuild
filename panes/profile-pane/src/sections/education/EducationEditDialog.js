import { importCss } from '../../importCss.js'
import { alertDialog, openInputDialog } from '../../ui/dialog.js'
import { html, render } from 'lit-html'
import 'solid-ui/components/button'
import 'solid-ui/components/select'
// (type-only import removed: EducationRow, EducationDetails from './types.js')
importCss(new URL('../../styles/EditDialogs.css', import.meta.url))
importCss(new URL('../contactInfo/ContactInfoEditDialog.css', import.meta.url))
import { LiveStore, NamedNode } from 'rdflib'
import { processEducationMutations } from './mutations.js'
// (type-only import removed: ViewerMode from '../../types.js')
import { addIcon, trashIcon } from '../../icons-svg/profileIcons.js'
import { applyRowFieldChange, deleteRow, summarizeRowOps } from '../shared/rowState.js'
import { hasNonEmptyText, sanitizeTextValue, toText } from '../../textUtils.js'
// (type-only import removed: MutationOps from '../shared/types.js')
import {
  deleteEntryButtonTitleText,
  dialogCancelLabelText,
  dialogSubmitLabelText,
  editEducationDialogTitleText,
  ownerLoginRequiredDialogMessageText,
  saveEducationUpdatesFailedMessageText,
} from '../../texts.js'

const EDUCATION_MONTH_OPTIONS = [
  { value: '01', label: 'January' },
  { value: '02', label: 'February' },
  { value: '03', label: 'March' },
  { value: '04', label: 'April' },
  { value: '05', label: 'May' },
  { value: '06', label: 'June' },
  { value: '07', label: 'July' },
  { value: '08', label: 'August' },
  { value: '09', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' }
]

function sanitizeEducationFieldValue(value) {
  return sanitizeTextValue(value)
}

function readEducationSelectChange(event) {
  const customEvent = event
  if (typeof customEvent.detail?.value === 'string') {
    return customEvent.detail.value
  }

  const target = event.target
  return typeof target?.value === 'string' ? target.value : ''
}

function getEducationYearOptions(selectedYears) {
  const currentYear = new Date().getFullYear()
  const baseYearOptions = Array.from({ length: 120 }, (_, i) => String(currentYear - i))
  const yearOptions = Array.from(new Set([
    ...baseYearOptions,
    ...selectedYears
  ].filter(Boolean))).sort((a, b) => Number(b) - Number(a))

  return yearOptions.map((year) => ({ label: year, value: year }))
}

function getEducationDateSelectOptions(kind, selectedYears) {
  if (kind === 'start-month' || kind === 'end-month') {
    return EDUCATION_MONTH_OPTIONS
  }

  return getEducationYearOptions(selectedYears)
}

function getEducationDateSelectValue(kind, row) {
  const startDateParts = parseYearMonthFromDateText(toText(row?.startDate))
  const endDateParts = parseYearMonthFromDateText(toText(row?.endDate))

  switch (kind) {
    case 'start-month':
      return startDateParts.month
    case 'start-year':
      return startDateParts.year
    case 'end-month':
      return endDateParts.month
    case 'end-year':
      return endDateParts.year
    default:
      return ''
  }
}

function getEducationDateSelectLabel(kind) {
  return kind === 'start-month' || kind === 'end-month' ? 'Select Month' : 'Select Year'
}

function parseYearMonthFromDateText(dateText) {
  const normalized = (dateText || '').trim()
  if (!normalized) return { year: '', month: '' }

  const isoYearMonth = normalized.match(/^(\d{4})-(\d{2})/)
  if (isoYearMonth) {
    return { year: isoYearMonth[1], month: isoYearMonth[2] }
  }

  const fallbackYear = normalized.match(/(\d{4})/)
  return {
    year: fallbackYear ? fallbackYear[1] : '',
    month: ''
  }
}

function rowHasContent(row) {

  return [
    row.school,
    toText(row.startDate),
    toText(row.endDate),
    row.degree,
    row.location,
    row.description
  ].some(hasNonEmptyText)
}

function toFormState(educationData) {

  const education = (educationData || [])
    .map((educationEntry) => ({
      school: sanitizeEducationFieldValue(toText(educationEntry.school)),
      startDate: educationEntry.startDate,
      endDate: educationEntry.endDate,
      degree: sanitizeEducationFieldValue(toText(educationEntry.degree)),
      location: sanitizeEducationFieldValue(toText(educationEntry.location)),
      description: sanitizeEducationFieldValue(toText(educationEntry.description)),
      entryNode: toText(educationEntry.entryNode),
      status: toText(educationEntry.entryNode) ? 'existing' : 'new'
    }))
    .filter((educationEntry) => rowHasContent(educationEntry) || Boolean(educationEntry.entryNode))

  return {
    educationData: education.length
      ? education
      : [{
        school: '',
        startDate: undefined,
        endDate: undefined,
        degree: '',
        location: '',
        description: '',
        entryNode: '',
        status: 'new'
      }]
  }
}

function validateEducationBeforeSave(rows) {
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    if (!row || row.status === 'deleted') continue
    if (!rowHasContent(row)) continue

  }

  return { ok: true }
}

function initializeEducationDateSelects(form, educationData) {
  const selectElements = form.querySelectorAll('solid-ui-select[data-education-date-kind]')

  selectElements.forEach((selectElement) => {
    const kind = selectElement.dataset.educationDateKind
    const rowIndex = Number(selectElement.dataset.educationRowIndex)
    if (!kind || Number.isNaN(rowIndex)) return

    const educationRow = educationData[rowIndex]
    if (!educationRow) return

    const startDateParts = parseYearMonthFromDateText(toText(educationRow.startDate))
    const endDateParts = parseYearMonthFromDateText(toText(educationRow.endDate))
    const selectedYears = [startDateParts.year, endDateParts.year]

    selectElement.options = getEducationDateSelectOptions(kind, selectedYears)
    selectElement.value = getEducationDateSelectValue(kind, educationRow)
    selectElement.label = getEducationDateSelectLabel(kind)
  })
}

function renderEducationInputRow({
  educationData,
  index,
  displayIndex,
  onDelete,
  onChange
}) {
  const educationRow = educationData[index]
  const label = `Education ${displayIndex + 1}`
  const educationHeadingId = `education-heading-${index}`

  const schoolName = `education-school-${index}`
  const degreeName = `education-degree-${index}`
  const descriptionName = `education-description-${index}`
  const descriptionCounterId = `education-description-counter-${index}`
  const descriptionMaxLength = 2000
  const descriptionCount = (educationRow?.description || '').length

  const startMonthLabel = `Start Month ${displayIndex + 1}`
  const startMonthInputName = `education-start-month-${index}`
  const startYearLabel = `Start Year ${displayIndex + 1}`
  const startYearInputName = `education-start-year-${index}`
  const startDateText = toText(educationRow?.startDate)
  const startDateParts = parseYearMonthFromDateText(startDateText)
  const startMonthValue = startDateParts.month
  const startYearText = startDateParts.year
  const endMonthLabel = `End Month ${displayIndex + 1}`
  const endMonthInputName = `education-end-month-${index}`
  const endDateText = toText(educationRow?.endDate)
  const endYearLabel = `End Year ${displayIndex + 1}`
  const endYearInputName = `education-end-year-${index}`
  const endDateParts = parseYearMonthFromDateText(endDateText)
  const endMonthValue = endDateParts.month
  const endYearParsedText = endDateParts.year

  const currentYear = new Date().getFullYear()
  const selectedYears = [startYearText, endYearParsedText]

  const handleEducationInput = (field) => (e) => {
    const target = e.target
    const nextValue = sanitizeEducationFieldValue(target.value)
    if (educationData[index]) {
      applyRowFieldChange(educationData[index], field, nextValue, rowHasContent)
      onChange()
    }
  }

  const handleDelete = (event) => {
    event.preventDefault()
    onDelete()
  }

  const buildDateLiteral = (month, year) => {
    if (!month || !year) return undefined
    return `${year}-${month}-01`
  }

  const handleStartMonthChange = (event) => {
    const month = readEducationSelectChange(event)
    const year = parseYearMonthFromDateText(toText(educationData[index]?.startDate)).year || String(currentYear)
    const nextStartDate = buildDateLiteral(month, year)
    if (educationData[index]) {
      applyRowFieldChange(educationData[index], 'startDate', nextStartDate, rowHasContent)
      onChange()
    }
  }

  const handleStartYearChange = (event) => {
    const year = readEducationSelectChange(event)
    const month = parseYearMonthFromDateText(toText(educationData[index]?.startDate)).month || '01'
    const nextStartDate = buildDateLiteral(month, year)
    if (educationData[index]) {
      applyRowFieldChange(educationData[index], 'startDate', nextStartDate, rowHasContent)
      onChange()
    }
  }

  const handleEndMonthChange = (event) => {
    const month = readEducationSelectChange(event)
    const year = parseYearMonthFromDateText(toText(educationData[index]?.endDate)).year || String(currentYear)
    const nextEndDate = buildDateLiteral(month, year)
    if (educationData[index]) {
      applyRowFieldChange(educationData[index], 'endDate', nextEndDate, rowHasContent)
      onChange()
    }
  }

  const handleEndYearChange = (event) => {
    const year = readEducationSelectChange(event)
    const month = parseYearMonthFromDateText(toText(educationData[index]?.endDate)).month || '01'
    const nextEndDate = buildDateLiteral(month, year)
    if (educationData[index]) {
      applyRowFieldChange(educationData[index], 'endDate', nextEndDate, rowHasContent)
      onChange()
    }
  }

  const handleDescriptionInput = (event) => {
    const target = event.target
    const nextValue = sanitizeEducationFieldValue(target.value.slice(0, descriptionMaxLength))
    if (educationData[index]) {
      applyRowFieldChange(educationData[index], 'description', nextValue, rowHasContent)
      onChange()
    }
  }

  return html`
    <div class="profile-edit-dialog__row" role="group" aria-labelledby=${educationHeadingId}>
      <h4 id=${educationHeadingId} class="profile-edit-dialog__entry-heading">${label}</h4>
      <div class="profile-edit-dialog__actions profile-edit-dialog__actions--edge">
        <solid-ui-button
          type="button"
          variant="icon"
          size="md"
          class="profile-edit-dialog__delete-button"
          aria-label=${`Delete education ${displayIndex + 1}`}
          title=${deleteEntryButtonTitleText}
          @click=${handleDelete}
        >
          <span slot="icon" class="profile-edit-dialog__delete-icon" aria-hidden="true">${trashIcon}</span>
        </solid-ui-button>
      </div>
    </div>
    <label aria-label=${`${label} School/College`} class="label profile-edit-dialog__field">
      School/College
      <input
        class="input"
        type="text"
        name=${schoolName}
        .value=${educationData[index]?.school || ''}
        data-contact-field="title"
        data-entry-node=${educationData[index]?.entryNode || ''}
        data-row-status=${educationData[index]?.status || 'n/a'}
        placeholder="School/College"
        autocomplete="organization"
        inputmode="text"
        @change=${handleEducationInput('school')}
      />
    </label>
    <div class="profile-edit-dialog__row">
      <label aria-label=${`${label} Degree`} class="label profile-edit-dialog__field">
        Degree
        <input
          class="input"
          type="text"
          name=${degreeName}
          .value=${educationData[index]?.degree || ''}
          required
          data-contact-field="degree"
          data-entry-node=${educationData[index]?.entryNode || ''}
          data-row-status=${educationData[index]?.status || 'n/a'}
          placeholder="Degree"
          autocomplete="off"
          inputmode="text"
          @change=${handleEducationInput('degree')}
        />
      </label>
    </div>
    <div class="profile-edit-dialog__row">
      <label aria-label=${startMonthLabel} class="label profile-edit-dialog__field-type">
        Start Month
        <solid-ui-select
          class="profile-edit-dialog__education-date-select"
          name=${startMonthInputName}
          data-education-date-kind="start-month"
          data-education-row-index=${String(index)}
          .options=${getEducationDateSelectOptions('start-month', selectedYears)}
          .value=${startMonthValue}
          .label=${getEducationDateSelectLabel('start-month')}
          @change=${handleStartMonthChange}
        ></solid-ui-select>
      </label>
      <label aria-label=${startYearLabel} class="label profile-edit-dialog__field-type">
        Start Year
        <solid-ui-select
          class="profile-edit-dialog__education-date-select"
          name=${startYearInputName}
          data-education-date-kind="start-year"
          data-education-row-index=${String(index)}
          .options=${getEducationDateSelectOptions('start-year', selectedYears)}
          .value=${startYearText}
          .label=${getEducationDateSelectLabel('start-year')}
          @change=${handleStartYearChange}
        ></solid-ui-select>
      </label>
      <label aria-label=${endMonthLabel} class="label profile-edit-dialog__field-type">
        End Month
        <solid-ui-select
          class="profile-edit-dialog__education-date-select"
          name=${endMonthInputName}
          data-education-date-kind="end-month"
          data-education-row-index=${String(index)}
          .options=${getEducationDateSelectOptions('end-month', selectedYears)}
          .value=${endMonthValue}
          .label=${getEducationDateSelectLabel('end-month')}
          @change=${handleEndMonthChange}
        ></solid-ui-select>
      </label>
      <label aria-label=${endYearLabel} class="label profile-edit-dialog__field-type">
        End Year
        <solid-ui-select
          class="profile-edit-dialog__education-date-select"
          name=${endYearInputName}
          data-education-date-kind="end-year"
          data-education-row-index=${String(index)}
          .options=${getEducationDateSelectOptions('end-year', selectedYears)}
          .value=${endYearParsedText}
          .label=${getEducationDateSelectLabel('end-year')}
          @change=${handleEndYearChange}
        ></solid-ui-select>
      </label>
    </div>
    <label aria-label=${`${label} Description`} class="label profile-edit-dialog__field profile-edit-dialog__field--full profile-edit-dialog__field--stack">
      <span>Description</span>
      <textarea
        class="profile-edit-dialog__textarea"
        name=${descriptionName}
        rows="4"
        .value=${educationData[index]?.description || ''}
        maxlength=${descriptionMaxLength}
        aria-describedby=${descriptionCounterId}
        data-contact-field="description"
        data-entry-node=${educationData[index]?.entryNode || ''}
        data-row-status=${educationData[index]?.status || 'n/a'}
        placeholder="Description"
        autocomplete="off"
        inputmode="text"
        @input=${handleDescriptionInput}
      ></textarea>
      <small id=${descriptionCounterId} aria-live="polite">${descriptionCount}/${descriptionMaxLength}</small>
    </label>
  `
}

function renderEducationSection(educationData, onAddRow) {
  const createNewRow = (event) => {
    event.preventDefault()
    educationData.push({
      school: '',
      degree: '',
      location: '',
      startDate: undefined,
      endDate: undefined,
      description: '',
      entryNode: '',
      status: 'new'
    })
    onAddRow()
  }

  const visibleEducationRows = educationData
    .map((education, index) => ({ education, index }))
    .filter(({ education }) => education.status !== 'deleted')

  return html`
    <section
      aria-labelledby="education-heading"
      class="profile-edit-dialog__section--education section-bg">
      <header class="profile__section-header">
        <h3 id="education-heading" class="profile-edit-dialog__section-heading">
          <span class="profile-edit-dialog__section-title-icon" aria-hidden="true">&#9993;</span>
          Education
        </h3>
        <solid-ui-button
          type="button"
          variant="secondary"
          size="sm"
          class="profile__action-button profile-action-text profile-edit-dialog__add-button"
          data-dialog-add-more="true"
          aria-label="Add another education entry"
          @click=${createNewRow}
        >
          <span class="profile__add-more-content">
            <span class="profile__add-more-icon" aria-hidden="true">${addIcon}</span>
            <span>Add More</span>
          </span>
        </solid-ui-button>
      </header>
      <fieldset>
        <legend class="sr-only">Education entries</legend>
        ${visibleEducationRows.map(({ index }, displayIndex) => renderEducationInputRow({
          educationData,
          index,
          displayIndex,
          onDelete: () => {
            deleteRow(educationData, index)
            onAddRow()
          },
          onChange: onAddRow
        }))}
      </fieldset>
    </section>
  `
}

function renderEducationEditTemplate(
  form,
  formState,
  rerender,
  viewerMode
) {
  render(html`
    ${renderEducationSection(formState.educationData, rerender)}
    ${viewerMode !== 'owner'
      ? html`<p class="profile-edit-dialog__login-message">${ownerLoginRequiredDialogMessageText}</p>`
      : null}
  `, form)

  initializeEducationDateSelects(form, formState.educationData)
}

function createEducationEditForm(educationData, viewerMode) {
  const form = document.createElement('form')
  form.classList.add('profile__edit-form')

  const formState = toFormState(educationData)
  const rerender = () => renderEducationEditTemplate(form, formState, rerender, viewerMode)
  rerender()

  return { form, formState, rerender }
}

export async function createEducationEditDialog(
  event,
  store,
  subject,
  educationData,
  viewerMode,
  onSaved
) {
  const dom = (event.currentTarget)?.ownerDocument || document
  const { form, formState, rerender } = createEducationEditForm(educationData, viewerMode)
  const triggerAddMore = () => {
    const addMoreButton = form.querySelector('[data-dialog-add-more="true"]')
    if (addMoreButton) addMoreButton.click()
  }

  const result = await openInputDialog({
    title: editEducationDialogTitleText,
    dom,
    form,
    shouldCloseWithoutSave: () => {
      const plan = summarizeRowOps(formState.educationData, rowHasContent)
      return plan.create.length === 0 && plan.update.length === 0 && plan.remove.length === 0
    },
    headerAction: {
      type: 'button',
      label: 'Add More',
      ariaLabel: 'Add another education entry',
      onClick: triggerAddMore
    },
    submitLabel: dialogSubmitLabelText,
    cancelLabel: dialogCancelLabelText,
    validate: async () => {
      if (viewerMode !== 'owner') {
        return ownerLoginRequiredDialogMessageText
      }

      const validation = validateEducationBeforeSave(formState.educationData)
      if (!validation.ok) {
        return validation.message || 'Please complete the required education fields.'
      }

      return null
    },
    onSave: async () => {
      const plan = summarizeRowOps(formState.educationData, rowHasContent)
      await processEducationMutations(store, subject, plan)
      rerender()
    },
    formatSaveError: (error) => {
      return error instanceof Error ? error.message : saveEducationUpdatesFailedMessageText
    }
  })

  if (!result) return
  if (onSaved) {
    await onSaved()
    return
  }
  await alertDialog('Education updates saved. Refresh to see latest values.', 'Saved', dom)
}
