export function strToUpperCase(str) {
  if (str.trim().length > 0) {
    const strCase = str.split(' ')
    for (let i = 0; i < strCase.length; i++) {
      strCase[i] = strCase[i].charAt(0).toUpperCase() +
        strCase[i].substring(1)
    }
    return strCase.join(' ')
  }
  return ''
}

export function toText(value) {
  if (!value) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'object' && 'value' in (value)) {
    const nested = (value).value
    return typeof nested === 'string' ? nested : ''
  }
  return ''
}

export function toTypeLabel(value) {
  const raw = toText(value).trim()
  if (!raw) return ''
  const withoutAngles = raw.replace(/^<|>$/g, '')
  const hashParts = withoutAngles.split('#')
  const lastByHash = hashParts[hashParts.length - 1]
  const slashParts = lastByHash.split('/')
  return slashParts[slashParts.length - 1]
}

export function sanitizeTextValue(value) {
  return value
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function hasNonEmptyText(value) {
  return Boolean(value && value.trim() !== '')
}
