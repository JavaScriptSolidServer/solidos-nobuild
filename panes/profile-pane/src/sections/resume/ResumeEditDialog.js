import { importCss } from '../../importCss.js'
import { alertDialog, openInputDialog } from '../../ui/dialog.js'
import { html, render } from 'lit-html'
import 'solid-ui/components/button'
import 'solid-ui/components/combobox'
import 'solid-ui/components/combobox-option'
import { defineAsyncComboboxOptionsProvider, Combobox } from 'solid-ui/components/combobox'
// (type-only import removed: RoleDetails, ResumeRow from './types.js')
importCss(new URL('../../styles/EditDialogs.css', import.meta.url))
import { LiveStore, NamedNode, literal } from 'rdflib'
import { processResumeMutations } from './mutations.js'
// (type-only import removed: ViewerMode from '../../types.js')
import { applyRowFieldChange, applyRowSelectChange, deleteRow, summarizeRowOps } from '../shared/rowState.js'
import { hasNonEmptyText, sanitizeTextValue, toText } from '../../textUtils.js'
// (type-only import removed: MutationOps from '../shared/types.js')
import { trashIcon } from '../../icons-svg/profileIcons.js'
import {
  deleteEntryButtonTitleText,
  dialogCancelLabelText,
  dialogSubmitLabelText,
  editResumeDialogTitleText,
  ownerLoginRequiredDialogMessageText,
  saveResumeUpdatesFailedMessageText
} from '../../texts.js'

const RESUME_ORGANIZATION_TYPE_OPTIONS = [
  { label: 'Corporation', value: 'Corporation' },
  { label: 'Educational Organization', value: 'EducationalOrganization' },
  { label: 'Research Organization', value: 'ResearchOrganization' },
  { label: 'Government Organization', value: 'GovernmentOrganization' },
  { label: 'NGO', value: 'NGO' },
  { label: 'Performing Group', value: 'PerformingGroup' },
  { label: 'Project', value: 'Project' },
  { label: 'Sports Organization', value: 'SportsOrganization' },
  { label: 'Other', value: 'Other' }
]

const RESUME_MONTH_OPTIONS = [
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

export const createResumeOrganizationOptionsProvider = (getSelectedType) => defineAsyncComboboxOptionsProvider(async (rawQuery) => {
    const query = sanitizeTextValue(rawQuery)

    if (query.length < 2) {
      return [{
        value: '',
        label: 'Type at least 2 characters to search',
        selectable: false
      }]
    }

    try {
      const response = await fetch(buildWikidataOrganizationSearchUrl(query))
      if (!response.ok) return []

      const payload = await response.json()
      const results = Array.isArray(payload?.search) ? payload.search : []
      const seen = new Set()
      const options = results
        .map((result) => {
          const label = sanitizeTextValue(toResumeOrganizationLabel(result))
          const value = sanitizeTextValue(
            typeof result?.concepturi === 'string'
              ? result.concepturi
              : typeof result?.url === 'string'
                ? result.url
                : ''
          )

          return { label, value }
        })
        .filter((option) => {
          if (!option.label) return false
          const key = option.label.toLowerCase()
          if (seen.has(key)) return false
          seen.add(key)
          return true
        })

      const resultIds = options
        .map((suggestion) => getWikidataIdFromUri(String(suggestion.value)))
        .filter(Boolean)

      if (!resultIds.length) {
        return options.slice(0, WIKIDATA_ORGANIZATION_SEARCH_LIMIT)
      }

      const resultEntities = await fetchWikidataEntities(resultIds)
      const relatedIds = Array.from(new Set(
        Object.values(resultEntities).flatMap((entity) => [
          ...getWikidataClaimIds(entity, 'P31'),
          ...getWikidataClaimIds(entity, 'P279')
        ])
      ))
      const relatedEntities = await fetchWikidataEntities(relatedIds)
      const entityMap = {
        ...resultEntities,
        ...relatedEntities
      }

      if (Object.keys(entityMap).length === 0) {
        return options.slice(0, WIKIDATA_ORGANIZATION_SEARCH_LIMIT)
      }

      const selectedType = getSelectedType()
      const filteredSuggestions = options.filter((suggestion) => {
        const entityId = getWikidataIdFromUri(String(suggestion.value))
        return entityMatchesAllowedOrganizationTypes(entityId, entityMap, selectedType)
      })

      return filteredSuggestions.slice(0, WIKIDATA_ORGANIZATION_SEARCH_LIMIT)
    } catch {
      return []
    }
})

const WIKIDATA_ORGANIZATION_SEARCH_URI = 'https://www.wikidata.org/w/api.php?action=wbsearchentities&language=$(language)&type=item&limit=$(limit)&format=json&origin=*&search=$(name)'
const WIKIDATA_ENTITY_LOOKUP_URI = 'https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&origin=*&props=claims&ids=$(ids)'
const WIKIDATA_ORGANIZATION_SEARCH_LANGUAGE = 'en'
const WIKIDATA_ORGANIZATION_SEARCH_LIMIT = 8
const WIKIDATA_ORGANIZATION_SEARCH_CANDIDATE_LIMIT = 24

const RESUME_ORGANIZATION_TYPE_WIKIDATA_CLASS_URIS = {
  Corporation: ['http://www.wikidata.org/entity/Q6881511', 'http://www.wikidata.org/entity/Q4830453'],
  EducationalOrganization: ['http://www.wikidata.org/entity/Q178706', 'http://www.wikidata.org/entity/Q2385804', 'http://www.wikidata.org/entity/Q1664720'],
  ResearchOrganization: ['http://www.wikidata.org/entity/Q31855'],
  GovernmentOrganization: ['http://www.wikidata.org/entity/Q327333'],
  NGO: ['http://www.wikidata.org/entity/Q163740', 'http://www.wikidata.org/entity/Q79913', 'http://www.wikidata.org/entity/Q708676'],
  PerformingGroup: ['http://www.wikidata.org/entity/Q32178211'],
  Project: ['http://www.wikidata.org/entity/Q170584'],
  SportsOrganization: ['http://www.wikidata.org/entity/Q4438121'],
  Other: ['http://www.wikidata.org/entity/Q43229']
}

const RESUME_ORGANIZATION_SEARCH_CLASS_URIS = Array.from(
  new Set(
    RESUME_ORGANIZATION_TYPE_OPTIONS.flatMap(
      (option) => RESUME_ORGANIZATION_TYPE_WIKIDATA_CLASS_URIS[option.value] || []
    )
  )
)

const RESUME_PRESENT_MONTH_VALUE = '__present__'

function buildWikidataOrganizationSearchUrl(name) {
  return WIKIDATA_ORGANIZATION_SEARCH_URI
    .replace('$(language)', encodeURIComponent(WIKIDATA_ORGANIZATION_SEARCH_LANGUAGE))
    .replace('$(limit)', encodeURIComponent(String(WIKIDATA_ORGANIZATION_SEARCH_CANDIDATE_LIMIT)))
    .replace('$(name)', encodeURIComponent(name))
}

function buildWikidataEntityLookupUrl(ids) {
  return WIKIDATA_ENTITY_LOOKUP_URI.replace('$(ids)', encodeURIComponent(ids.join('|')))
}

function getWikidataIdFromUri(value) {
  const trimmed = sanitizeTextValue(value)
  const match = trimmed.match(/Q\d+/)
  return match ? match[0] : ''
}

function getWikidataClaimIds(entity, property) {
  const claims = entity?.claims?.[property] || []

  return claims
    .map((claim) => claim?.mainsnak)
    .filter((snak) => snak?.snaktype === 'value')
    .map((snak) => snak?.datavalue?.value?.id)
    .filter((id) => typeof id === 'string' && id.length > 0)
}

function getAllowedOrganizationTypeIds(selectedType) {
  const normalizedType = normalizeResumeOrganizationTypeValue(selectedType)
  const typeUris = RESUME_ORGANIZATION_TYPE_WIKIDATA_CLASS_URIS[normalizedType]

  if (!typeUris?.length) {
    return RESUME_ORGANIZATION_SEARCH_CLASS_URIS
      .map((uri) => getWikidataIdFromUri(uri))
      .filter(Boolean)
  }

  return typeUris
    .map((uri) => getWikidataIdFromUri(uri))
    .filter(Boolean)
}

const allowedOrganizationTypeIdSetCache = new Map()

function getAllowedOrganizationTypeIdSet(selectedType) {
  const normalizedType = normalizeResumeOrganizationTypeValue(selectedType)
  const cachedIds = allowedOrganizationTypeIdSetCache.get(normalizedType)

  if (cachedIds) {
    return cachedIds
  }

  const allowedIds = new Set(getAllowedOrganizationTypeIds(normalizedType))
  allowedOrganizationTypeIdSetCache.set(normalizedType, allowedIds)
  return allowedIds
}

async function fetchWikidataEntities(ids) {
  const uniqueIds = Array.from(new Set(ids.filter(Boolean)))
  if (!uniqueIds.length || typeof fetch !== 'function') return {}

  const response = await fetch(buildWikidataEntityLookupUrl(uniqueIds))
  if (!response.ok) return {}

  const payload = await response.json()
  return payload?.entities || {}
}

function entityMatchesAllowedOrganizationTypes(
  entityId,
  entityMap,
  selectedType
) {
  const allowedIds = getAllowedOrganizationTypeIdSet(selectedType)
  const visited = new Set()
  const agenda = [entityId]

  while (agenda.length) {
    const currentId = agenda.shift()
    if (!currentId || visited.has(currentId)) continue
    visited.add(currentId)

    if (allowedIds.has(currentId)) {
      return true
    }

    const entity = entityMap[currentId]
    agenda.push(...getWikidataClaimIds(entity, 'P31'))
    agenda.push(...getWikidataClaimIds(entity, 'P279'))
  }

  return false
}

function toResumeOrganizationLabel(result) {
  return result?.label || result?.match?.text || result?.id || ''
}

function normalizeResumeOrganizationTypeValue(value) {
  return RESUME_ORGANIZATION_TYPE_OPTIONS.some((option) => option.value === value)
    ? value
    : RESUME_ORGANIZATION_TYPE_OPTIONS[0]?.value || ''
}

function getResumeYearOptions(selectedYears) {
  const currentYear = new Date().getFullYear()
  const baseYearOptions = Array.from({ length: 120 }, (_, i) => String(currentYear - i))
  const yearOptions = Array.from(new Set([
    ...baseYearOptions,
    ...selectedYears
  ].filter(Boolean))).sort((a, b) => Number(b) - Number(a))

  return yearOptions.map((year) => ({ label: year, value: year }))
}

function getResumeDateSelectOptions(
  kind,
  selectedYears,
  isCurrentRole
) {
  if (kind === 'start-month') {
    return RESUME_MONTH_OPTIONS
  }

  if (kind === 'start-year') {
    return getResumeYearOptions(selectedYears)
  }

  if (kind === 'end-month') {
    if (isCurrentRole) {
      return [{ value: RESUME_PRESENT_MONTH_VALUE, label: 'Present' }]
    }

    return RESUME_MONTH_OPTIONS
  }

  if (kind === 'end-year' && isCurrentRole) {
    return [{ value: '', label: '' }]
  }

  return getResumeYearOptions(selectedYears)
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

  return Boolean(row.isCurrentRole) || [
    row.title,
    row.roleType,
    toText(row.startDate),
    toText(row.endDate),
    row.orgName,
    row.orgType,
    row.orgLocation,
    row.orgHomePage,
    row.description
  ].some(hasNonEmptyText)
}

function toFormState(resumeData) {

  const roles = (resumeData || [])
    .map((role) => ({
      title: sanitizeTextValue(toText(role.title)),
      roleType: sanitizeTextValue(toText(role.roleType)),
      startDate: role.startDate,
      endDate: role.endDate,
      isCurrentRole: role.isCurrentRole ?? !role.endDate,
      orgName: sanitizeTextValue(toText(role.orgName)),
      orgPublicId: sanitizeTextValue(toText(role.orgPublicId)),
      orgType: normalizeResumeOrganizationTypeValue(sanitizeTextValue(toText(role.orgType))),
      orgLocation: sanitizeTextValue(toText(role.orgLocation)),
      orgHomePage: sanitizeTextValue(toText(role.orgHomePage)),
      description: sanitizeTextValue(toText(role.description)),
      entryNode: toText(role.entryNode),
      status: toText(role.entryNode) ? 'existing' : 'new'
    }))
    .filter((role) => rowHasContent(role) || Boolean(role.entryNode))

  return {
    resumeData: roles.length
      ? roles
      : [{
        title: '',
        roleType: '',
        startDate: undefined,
        endDate: undefined,
        isCurrentRole: false,
        orgName: '',
        orgPublicId: '',
        orgType: RESUME_ORGANIZATION_TYPE_OPTIONS[0].value,
        orgLocation: '',
        orgHomePage: '',
        description: '',
        entryNode: '',
        status: 'new'
      }]
  }
}

function validateResumeBeforeSave(rows) {
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    if (!row || row.status === 'deleted') continue
    if (!rowHasContent(row)) continue

    const endDateText = toText(row.endDate).trim()
    if (!row.isCurrentRole && !endDateText) {
      return {
        ok: false,
        message: `Resume ${i + 1}: End Year is required unless "I am currently working in this role" is selected.`
      }
    }
  }

  return { ok: true }
}

function initializeResumeOrganizationComboboxes(form, resumeData) {
  const comboboxElements = form.querySelectorAll('solid-ui-combobox[data-resume-organization-index]')

  comboboxElements.forEach((comboboxElement) => {
    const rowIndex = Number(comboboxElement.dataset.resumeOrganizationIndex)
    if (Number.isNaN(rowIndex)) return

    const resumeRow = resumeData[rowIndex]
    if (!resumeRow) return

    comboboxElement.optionsFallback = resumeRow.orgName
      ? [{ label: resumeRow.orgName, value: resumeRow.orgPublicId  }]
      : []
    comboboxElement.asyncOptionsProvider = createResumeOrganizationOptionsProvider(() => normalizeResumeOrganizationTypeValue(resumeRow.orgType || ''))
    comboboxElement.value = resumeRow.orgPublicId || resumeRow.orgName
  })
}

function syncResumeOrganizationRowsFromComboboxes(form, resumeData) {
  const comboboxElements = form.querySelectorAll('solid-ui-combobox[data-resume-organization-index]')

  comboboxElements.forEach((comboboxElement) => {
    const rowIndex = Number(comboboxElement.dataset.resumeOrganizationIndex)
    if (Number.isNaN(rowIndex) || !resumeData[rowIndex]) return

    const nextName = comboboxElement.selectedOption ? sanitizeTextValue(comboboxElement.selectedOption.label) : sanitizeTextValue(String(comboboxElement.value))
    const nextPublicId = comboboxElement.selectedOption ? sanitizeTextValue(String(comboboxElement.selectedOption.value)) : ''

    applyRowFieldChange(resumeData[rowIndex], 'orgName', nextName, rowHasContent)
    resumeData[rowIndex].orgPublicId = nextPublicId
  })
}

function renderResumeInputRow({
  resumeData,
  index,
  displayIndex,
  onDelete,
  onChange
}) {
  const resumeRow = resumeData[index]
  const label = `Experience ${displayIndex + 1}`
  const experienceHeadingId = `resume-experience-heading-${index}`

  const titleName = `resume-title-${index}`
  const organizationName = `resume-organization-${index}`
  const organizationTypeName = `resume-organization-type-${index}`
  const companyUrlName = `resume-company-url-${index}`
  const orgLocationName = `resume-org-location-${index}`
  const descriptionName = `resume-description-${index}`
  const descriptionCounterId = `resume-description-counter-${index}`
  const descriptionMaxLength = 2000
  const descriptionCount = (resumeRow?.description || '').length

  const startMonthLabel = `Start Month ${displayIndex + 1}`
  const startMonthInputName = `resume-start-month-${index}`
  const startYearLabel = `Start Year ${displayIndex + 1}`
  const startYearInputName = `resume-start-year-${index}`
  const startDateText = toText(resumeRow?.startDate)
  const startDateParts = parseYearMonthFromDateText(startDateText)
  const startMonthValue = startDateParts.month
  const startYearText = startDateParts.year
  const endMonthLabel = `End Month ${displayIndex + 1}`
  const endMonthInputName = `resume-end-month-${index}`
  const endDateText = toText(resumeRow?.endDate)
  const endYearLabel = `End Year ${displayIndex + 1}`
  const endYearInputName = `resume-end-year-${index}`
  const endDateParts = parseYearMonthFromDateText(endDateText)
  const endMonthValue = endDateParts.month
  const endYearParsedText = endDateParts.year
  const isCurrentRoleId = `resume-current-role-${index}`
  const currentYear = new Date().getFullYear()
  const selectedYears = [startYearText, endYearParsedText]
  const organizationTypeOptions = RESUME_ORGANIZATION_TYPE_OPTIONS
  const startMonthOptions = getResumeDateSelectOptions('start-month', selectedYears, Boolean(resumeRow?.isCurrentRole))
  const startYearOptions = getResumeDateSelectOptions('start-year', selectedYears, Boolean(resumeRow?.isCurrentRole))
  const endMonthOptions = getResumeDateSelectOptions('end-month', selectedYears, Boolean(resumeRow?.isCurrentRole))
  const endYearOptions = getResumeDateSelectOptions('end-year', selectedYears, Boolean(resumeRow?.isCurrentRole))

  const handleResumeInput = (field) => (e) => {
    const target = e.target
    const nextValue = sanitizeTextValue(target.value)
    if (resumeRow) {
      applyRowFieldChange(resumeRow, field, nextValue, rowHasContent)
      onChange()
    }
  }

  const handleDelete = (event) => {
    event.preventDefault()
    onDelete()
  }

  const buildDateLiteral = (month, year) => {
    if (!month || !year) return undefined
    return literal(`${year}-${month}-01`)
  }

  /* The following function was generated by AI Model: GPT-5.3-Codex  */
  /* Prompt: can you make this a month drop down for the start year */
  const handleStartMonthChange = (event) => {
    const comboboxEvent = event
    if (!comboboxEvent.detail.option) return
    const month = String(comboboxEvent.detail.option.value)
    const year = parseYearMonthFromDateText(toText(resumeData[index]?.startDate)).year || String(currentYear)
    const nextStartDate = buildDateLiteral(month, year)
    if (resumeData[index]) {
      applyRowFieldChange(resumeData[index], 'startDate', nextStartDate, rowHasContent)
      onChange()
    }
  }

  const handleStartYearChange = (event) => {
    const comboboxEvent = event
    if (!comboboxEvent.detail.option) return
    const year = String(comboboxEvent.detail.option.value)
    const month = parseYearMonthFromDateText(toText(resumeData[index]?.startDate)).month || '01'
    const nextStartDate = buildDateLiteral(month, year)
    if (resumeData[index]) {
      applyRowFieldChange(resumeData[index], 'startDate', nextStartDate, rowHasContent)
      onChange()
    }
  }

  const handleEndMonthChange = (event) => {
    if (resumeData[index]?.isCurrentRole) return
    const comboboxEvent = event
    if (!comboboxEvent.detail.option) return
    const month = String(comboboxEvent.detail.option.value)
    const year = parseYearMonthFromDateText(toText(resumeData[index]?.endDate)).year || String(currentYear)
    const nextEndDate = buildDateLiteral(month, year)
    if (resumeData[index]) {
      applyRowFieldChange(resumeData[index], 'endDate', nextEndDate, rowHasContent)
      onChange()
    }
  }

  const handleEndYearChange = (event) => {
    if (resumeData[index]?.isCurrentRole) return
    const comboboxEvent = event
    if (!comboboxEvent.detail.option) return
    const year = String(comboboxEvent.detail.option.value)
    const month = parseYearMonthFromDateText(toText(resumeData[index]?.endDate)).month || '01'
    const nextEndDate = buildDateLiteral(month, year)
    if (resumeData[index]) {
      applyRowFieldChange(resumeData[index], 'endDate', nextEndDate, rowHasContent)
      onChange()
    }
  }

  const handleDescriptionInput = (event) => {
    const target = event.target
    const nextValue = sanitizeTextValue(target.value.slice(0, descriptionMaxLength))
    if (resumeData[index]) {
      applyRowFieldChange(resumeData[index], 'description', nextValue, rowHasContent)
      onChange()
    }
  }

  const handleCurrentRoleToggle = (event) => {
    const target = event.target
    if (resumeData[index]) {
      applyRowFieldChange(resumeData[index], 'isCurrentRole', target.checked, rowHasContent)
      if (target.checked) {
        applyRowFieldChange(resumeData[index], 'endDate', undefined, rowHasContent)
      }

      onChange()
    }
  }

  const handleOrganizationTypeInput = (e) => {
    const event = e
    if (!event.detail.option) return
    const nextType = normalizeResumeOrganizationTypeValue(String(event.detail.option.value))
    if (resumeRow) {
      applyRowSelectChange(resumeRow, 'orgType', nextType)
      resumeRow.orgPublicId = ''
      onChange()
    }
  }

  const handleOrganizationNameInput = (event) => {
    const combobox = event.target

    applyRowFieldChange(resumeRow, 'orgName', sanitizeTextValue(String(combobox.value)), rowHasContent)
    resumeRow.orgPublicId = ''
  }

  const handleOrganizationNameChange = (event) => {
    if (!resumeRow || !event.detail.option) return

    applyRowFieldChange(resumeRow, 'orgName', sanitizeTextValue(event.detail.option.label), rowHasContent)
    resumeRow.orgPublicId = String(event.detail.option.value)
  }

  return html`
    <div class="profile-edit-dialog__row profile-edit-dialog__row--resume-entry-header" role="group" aria-labelledby=${experienceHeadingId}>
      <h3 id=${experienceHeadingId} class="profile-edit-dialog__entry-heading">${label}</h3>
      <div class="profile-edit-dialog__actions profile-edit-dialog__actions--edge">
        <solid-ui-button
          variant="ghost"
          aria-label=${`Delete resume ${displayIndex + 1}`}
          title=${deleteEntryButtonTitleText}
          @click=${handleDelete}
        >
          <span slot="icon" aria-hidden="true">${trashIcon}</span>
        </solid-ui-button>
      </div>
    </div>
    <label aria-label=${`${label} Title`} class="label profile-edit-dialog__field">
      Title
      <input
        class="input"
        type="text"
        name=${titleName}
        .value=${resumeRow?.title || ''}
        data-contact-field="title"
        data-entry-node=${resumeRow?.entryNode || ''}
        data-row-status=${resumeRow?.status || 'n/a'}
        placeholder="Title"
        autocomplete="title"
        inputmode="text"
        @change=${handleResumeInput('title')}
      />
    </label>
    <div class="profile-edit-dialog__row">
      <label aria-label=${`${label} Organization Type`} class="label profile-edit-dialog__field">
        Organization Type
        <solid-ui-combobox
          select-only
          class="profile-edit-dialog__resume-organization-type-select"
          name=${organizationTypeName}
          .value=${normalizeResumeOrganizationTypeValue(resumeRow?.orgType || '')}
          @change=${handleOrganizationTypeInput}
        >
          ${organizationTypeOptions.map((option) => html`<solid-ui-combobox-option value=${option.value}>${option.label}</solid-ui-combobox-option>`)}
        </solid-ui-combobox>
      </label>
      <label aria-label=${`${label} Organization Name`} class="label profile-edit-dialog__field">
        Company or Organization
        <solid-ui-combobox
          name=${organizationName}
          placeholder="Company or Organization"
          data-resume-organization-index=${String(index)}
          required
          @input=${handleOrganizationNameInput}
          @change=${handleOrganizationNameChange}
        ></solid-ui-combobox>
      </label>
    </div>
    <div class="profile-edit-dialog__row">
      <label aria-label=${`${label} Company URL`} class="label profile-edit-dialog__field">
        Company URL
        <input
          class="input"
          type="text"
          name=${companyUrlName}
          .value=${resumeRow?.orgHomePage || ''}
          data-contact-field="orgHomePage"
          data-entry-node=${resumeRow?.entryNode || ''}
          data-row-status=${resumeRow?.status || 'n/a'}
          placeholder="Company URL"
          autocomplete="url"
          inputmode="text"
          @change=${handleResumeInput('orgHomePage')}
        />
      </label>
      <label aria-label=${`${label} Location`} class="label profile-edit-dialog__field profile-edit-dialog__field--resume-location">
        Location
        <input
          class="input"
          type="text"
          name=${orgLocationName}
          .value=${resumeRow?.orgLocation || ''}
          data-contact-field="orgLocation"
          data-entry-node=${resumeRow?.entryNode || ''}
          data-row-status=${resumeRow?.status || 'n/a'}
          placeholder="Location"
          autocomplete="address-level2"
          inputmode="text"
          @change=${handleResumeInput('orgLocation')}
        />
      </label>
    </div>
    <div class="profile-edit-dialog__row profile-edit-dialog__row--resume-dates">
      <label aria-label=${`Start Date ${displayIndex + 1}`} class="label profile-edit-dialog__field profile-edit-dialog__field--date-group">
        <span>Start Date</span>
        <div class="profile-edit-dialog__date-pair">
          <solid-ui-combobox
            select-only
            class="profile-edit-dialog__resume-date-select"
            name=${startMonthInputName}
            aria-label=${startMonthLabel}
            .value=${startMonthValue}
            @change=${handleStartMonthChange}
          >
            ${startMonthOptions.map((option) => html`<solid-ui-combobox-option value=${option.value}>${option.label}</solid-ui-combobox-option>`)}
          </solid-ui-combobox>
          <solid-ui-combobox
            select-only
            class="profile-edit-dialog__resume-date-select"
            name=${startYearInputName}
            aria-label=${startYearLabel}
            .value=${startYearText}
            @change=${handleStartYearChange}
          >
            ${startYearOptions.map((option) => html`<solid-ui-combobox-option value=${option.value}>${option.label}</solid-ui-combobox-option>`)}
          </solid-ui-combobox>
        </div>
      </label>
      <label aria-label=${`End Date ${displayIndex + 1}`} class="label profile-edit-dialog__field profile-edit-dialog__field--date-group">
        <span>End Date</span>
        <div class="profile-edit-dialog__date-pair">
          <solid-ui-combobox
            select-only
            class=${`profile-edit-dialog__resume-date-select${resumeRow?.isCurrentRole ? ' profile-edit-dialog__resume-date-select--disabled' : ''}`}
            name=${endMonthInputName}
            aria-label=${endMonthLabel}
            aria-disabled=${String(Boolean(resumeRow?.isCurrentRole))}
            tabindex=${resumeRow?.isCurrentRole ? '-1' : '0'}
            .value=${resumeRow?.isCurrentRole ? RESUME_PRESENT_MONTH_VALUE : endMonthValue}
            @change=${handleEndMonthChange}
          >
            ${endMonthOptions.map((option) => html`<solid-ui-combobox-option value=${option.value}>${option.label}</solid-ui-combobox-option>`)}
          </solid-ui-combobox>
          <solid-ui-combobox
            select-only
            class=${`profile-edit-dialog__resume-date-select${resumeRow?.isCurrentRole ? ' profile-edit-dialog__resume-date-select--disabled' : ''}`}
            name=${endYearInputName}
            aria-label=${endYearLabel}
            aria-disabled=${String(Boolean(resumeRow?.isCurrentRole))}
            tabindex=${resumeRow?.isCurrentRole ? '-1' : '0'}
            .value=${resumeRow?.isCurrentRole ? '' : endYearParsedText}
            @change=${handleEndYearChange}
          >
            ${endYearOptions.map((option) => html`<solid-ui-combobox-option value=${option.value}>${option.label}</solid-ui-combobox-option>`)}
          </solid-ui-combobox>
        </div>
      </label>
    </div>
    <div class="profile-edit-dialog__row profile-edit-dialog__row--inline-end">
      <label class="label profile-edit-dialog__checkbox-label" for=${isCurrentRoleId}>
        <input
          class="profile-edit-dialog__checkbox-input"
          type="checkbox"
          id=${isCurrentRoleId}
          name="isCurrentRole"
          .checked=${Boolean(resumeRow?.isCurrentRole)}
          @change=${handleCurrentRoleToggle}
        />
        <span>I am currently working in this role</span>
      </label>
    </div>
    <label aria-label=${`${label} Description`} class="label profile-edit-dialog__field profile-edit-dialog__field--full profile-edit-dialog__field--stack">
      <span>Description</span>
      <textarea
        class="profile-edit-dialog__textarea"
        name=${descriptionName}
        rows="4"
        .value=${resumeRow?.description || ''}
        maxlength=${descriptionMaxLength}
        aria-describedby=${descriptionCounterId}
        data-contact-field="description"
        data-entry-node=${resumeRow?.entryNode || ''}
        data-row-status=${resumeRow?.status || 'n/a'}
        placeholder="Description"
        autocomplete="off"
        inputmode="text"
        @input=${handleDescriptionInput}
      ></textarea>
      <small id=${descriptionCounterId} aria-live="polite">${descriptionCount}/${descriptionMaxLength}</small>
    </label>
  `
}

function renderResumeSection(resumeData, onAddRow) {
  const visibleResumeRows = resumeData
    .map((resume, index) => ({ resume, index }))
    .filter(({ resume }) => resume.status !== 'deleted')

  return html`
    <section class="profile-edit-dialog__section profile-edit-dialog__section--resume" aria-label="Resume">
      <fieldset>
        <legend class="sr-only">Resume entries</legend>
        ${visibleResumeRows.map(({ index }, displayIndex) => renderResumeInputRow({
          resumeData,
          index,
          displayIndex,
          onDelete: () => {
            deleteRow(resumeData, index)
            onAddRow()
          },
          onChange: onAddRow
        }))}
      </fieldset>
    </section>
  `
}

function renderResumeEditTemplate(
  form,
  formState,
  rerender,
  viewerMode
) {
  render(html`
    ${renderResumeSection(formState.resumeData, rerender)}
    ${viewerMode !== 'owner'
      ? html`<p class="profile-edit-dialog__login-message">${ownerLoginRequiredDialogMessageText}</p>`
      : null}
  `, form)
  initializeResumeOrganizationComboboxes(form, formState.resumeData)
}

function captureResumeDialogRenderState(form) {
  const dialog = form.closest('dialog')
  const description = dialog?.querySelector('#modal-desc')
  const activeElement = form.ownerDocument.activeElement
  const activeTextField = activeElement instanceof HTMLInputElement || activeElement instanceof HTMLTextAreaElement
    ? activeElement
    : null

  return {
    dialogScrollTop: dialog?.scrollTop || 0,
    descriptionScrollTop: description?.scrollTop || 0,
    activeId: activeElement?.id || '',
    activeName: activeElement?.getAttribute('name') || '',
    selectionStart: activeTextField?.selectionStart ?? null,
    selectionEnd: activeTextField?.selectionEnd ?? null,
    fieldScrollLeft: activeTextField?.scrollLeft || 0,
    fieldScrollTop: activeTextField?.scrollTop || 0
  }
}

function restoreResumeDialogRenderState(form, state) {
  const dialog = form.closest('dialog')
  const description = dialog?.querySelector('#modal-desc')

  if (dialog) dialog.scrollTop = state.dialogScrollTop
  if (description) description.scrollTop = state.descriptionScrollTop

  const escapedId = state.activeId && typeof CSS !== 'undefined' && typeof CSS.escape === 'function'
    ? CSS.escape(state.activeId)
    : state.activeId
  const escapedName = state.activeName && typeof CSS !== 'undefined' && typeof CSS.escape === 'function'
    ? CSS.escape(state.activeName)
    : state.activeName

  let nextActive = null
  if (escapedId) {
    nextActive = form.querySelector(`#${escapedId}`)
  }
  if (!nextActive && escapedName) {
    nextActive = form.querySelector(`[name="${escapedName}"]`)
  }

  focusResumeFieldElement(nextActive, {
    selectionStart: state.selectionStart,
    selectionEnd: state.selectionEnd,
    scrollLeft: state.fieldScrollLeft,
    scrollTop: state.fieldScrollTop
  })
}

function getResumeFocusableTarget(element) {
  if (!element) return null

  if (element.tagName === 'SOLID-UI-COMBOBOX') {
    const comboboxInput = element.shadowRoot?.querySelector('input')
    if (comboboxInput) return comboboxInput
  }

  return element
}

function focusResumeFieldElement(element, options = {}) {
  const focusTarget = getResumeFocusableTarget(element)
  if (!focusTarget || typeof focusTarget.focus !== 'function') return

  const view = focusTarget.ownerDocument.defaultView
  const shouldAvoidFocus = Boolean(
    view?.matchMedia &&
    (view.matchMedia('(pointer: coarse)').matches || view.matchMedia('(max-width: 640px)').matches)
  )

  if (shouldAvoidFocus) {
    focusTarget.scrollIntoView({ block: 'nearest', behavior: 'auto' })
    return
  }

  focusTarget.focus({ preventScroll: true })
  if (focusTarget instanceof HTMLInputElement || focusTarget instanceof HTMLTextAreaElement) {
    const selectionStart = options.selectionStart ?? focusTarget.value.length
    const selectionEnd = options.selectionEnd ?? selectionStart

    focusTarget.setSelectionRange(selectionStart, selectionEnd)
    focusTarget.scrollLeft = options.scrollLeft ?? focusTarget.scrollLeft
    focusTarget.scrollTop = options.scrollTop ?? focusTarget.scrollTop
    requestAnimationFrame(() => {
      focusTarget.scrollLeft = options.scrollLeft ?? focusTarget.scrollLeft
      focusTarget.scrollTop = options.scrollTop ?? focusTarget.scrollTop
    })
  }

  if (element?.tagName === 'SOLID-UI-COMBOBOX') {
    const comboboxHost = element
    if (comboboxHost._closePopup) {
      requestAnimationFrame(() => {
        comboboxHost._closePopup?.()
      })
    }
  }
}

function focusResumeField(form, selector) {
  const nextField = form.querySelector(selector)
  if (!nextField) return

  focusResumeFieldElement(nextField)
}

function createResumeEditForm(resumeData, viewerMode) {
  const form = document.createElement('form')
  form.classList.add('profile__edit-form')
  form.classList.add('profile__edit-form--resume')

  const formState = toFormState(resumeData)
  const rerender = (options = {}) => {
    const { preserveState = true, focusSelector } = options
    const renderState = preserveState ? captureResumeDialogRenderState(form) : null
    renderResumeEditTemplate(form, formState, rerender, viewerMode)
    if (renderState) {
      restoreResumeDialogRenderState(form, renderState)
    }
    if (focusSelector) {
      focusResumeField(form, focusSelector)
    }
  }
  rerender()

  const addRow = () => {
    formState.resumeData.unshift({
      title: '',
      roleType: '',
      startDate: undefined,
      endDate: undefined,
      isCurrentRole: false,
      orgName: '',
      orgPublicId: '',
      orgType: RESUME_ORGANIZATION_TYPE_OPTIONS[0].value,
      orgLocation: '',
      orgHomePage: '',
      description: '',
      entryNode: '',
      status: 'new'
    })
    rerender({ preserveState: false, focusSelector: '[name="resume-title-0"]' })
  }

  return { form, formState, rerender, addRow }
}

export async function createResumeEditDialog(
  event,
  store,
  subject,
  resumeData,
  viewerMode,
  onSaved
) {
  const dom = (event.currentTarget)?.ownerDocument || document
  const { form, formState, rerender, addRow } = createResumeEditForm(resumeData, viewerMode)

  const result = await openInputDialog({
    title: editResumeDialogTitleText,
    dom,
    form,
    shouldCloseWithoutSave: () => {
      syncResumeOrganizationRowsFromComboboxes(form, formState.resumeData)
      const plan = summarizeRowOps(formState.resumeData, rowHasContent)
      return plan.create.length === 0 && plan.update.length === 0 && plan.remove.length === 0
    },
    headerAction: {
      type: 'button',
      label: '+ Add More',
      ariaLabel: 'Add another resume entry',
      onClick: addRow
    },
    submitLabel: dialogSubmitLabelText,
    cancelLabel: dialogCancelLabelText,
    validate: async () => {
      syncResumeOrganizationRowsFromComboboxes(form, formState.resumeData)
      if (viewerMode !== 'owner') {
        return ownerLoginRequiredDialogMessageText
      }

      const validation = validateResumeBeforeSave(formState.resumeData)
      if (!validation.ok) {
        return validation.message || 'Please complete the required resume fields.'
      }

      return null
    },
    onSave: async () => {
      syncResumeOrganizationRowsFromComboboxes(form, formState.resumeData)
      const plan = summarizeRowOps(formState.resumeData, rowHasContent)
      await processResumeMutations(store, subject, plan)
      rerender()
    },
    formatSaveError: (error) => {
      return error instanceof Error ? error.message : saveResumeUpdatesFailedMessageText
    }
  })

  if (!result) return
  if (onSaved) {
    await onSaved()
    return
  }
  await alertDialog('Resume updates saved. Refresh to see latest values.', 'Saved', dom)
}
