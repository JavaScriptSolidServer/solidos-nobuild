import { toTypeLabel } from '../../textUtils.js'

export function normalizePhoneTypeForEdit(value) {
  const label = toTypeLabel(value).trim().toLowerCase()
  if (!label) return ''

  if (label === 'cell' || label === 'mobile') return 'Mobile'
  if (label === 'home') return 'Home'
  if (label === 'work' || label === 'office') return 'Work'
  return ''
}

export function normalizePhoneTypeForContactInfoEdit(value) {
  const label = toTypeLabel(value).trim().toLowerCase()
  if (!label) return ''

  if (label === 'cell' || label === 'mobile') return 'Cell'
  if (label === 'home') return 'Home'
  if (label === 'work' || label === 'office') return 'Work'
  return ''
}

export function normalizeEmailTypeForEdit(value) {
  const label = toTypeLabel(value).trim().toLowerCase()
  if (!label) return ''

  if (label === 'personal' || label === 'home') return 'Personal'
  if (label === 'office' || label === 'work') return 'Office'
  return ''
}

export function normalizeEmailTypeForContactInfoEdit(value) {
  const label = toTypeLabel(value).trim().toLowerCase()
  if (!label) return ''

  if (label === 'personal' || label === 'home') return 'Home'
  if (label === 'office' || label === 'work') return 'Office'
  return ''
}

export function toSavedHeadingEmailType(type) {
  return type === 'Personal' ? 'Home' : (type || '')
}

export function toSavedHeadingPhoneType(type) {
  return type === 'Mobile' ? 'Cell' : (type || '')
}
