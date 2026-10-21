import { sanitizeTextValue } from '../../textUtils.js'

export function sanitizeEmailValue(value) {
  return sanitizeTextValue(value).replace(/\s+/g, '').toLowerCase()
}

export function sanitizePhoneLocalValue(value) {
  return sanitizeTextValue(value).replace(/[^0-9()\-\s.]/g, '')
}

export function sanitizeAddressFieldValue(value) {
  return sanitizeTextValue(value)
}

export function sanitizeBasicInputFieldValue(value) {
  return sanitizeTextValue(value)
}
