

export function isAbsoluteHttpUri (value) {
  try {
    const url = new URL(value)
    return (url.protocol === 'http:' || url.protocol === 'https:') && Boolean(url.hostname)
  } catch {
    return false
  }
}

export function isOriginUrl (value) {
  if (!isAbsoluteHttpUri(value)) {
    return false
  }

  const url = new URL(value)
  return url.pathname === '/' &&
    !url.search &&
    !url.hash &&
    !url.username &&
    !url.password
}

export function normalizeOriginInput (value) {
  const trimmedValue = value.trim()
  if (!trimmedValue || isAbsoluteHttpUri(trimmedValue)) {
    return undefined
  }

  try {
    const parsed = new URL(`https://${trimmedValue}`)
    const isHttpOrigin = parsed.protocol === 'http:' || parsed.protocol === 'https:'
    const hasOnlyOriginParts = parsed.pathname === '/' && !parsed.search && !parsed.hash
    const isRecognizedHost = parsed.hostname.includes('.') ||
      parsed.hostname.includes(':')

    return isHttpOrigin && hasOnlyOriginParts && isRecognizedHost && !parsed.username && !parsed.password
      ? parsed.origin
      : undefined
  } catch {
    return undefined
  }
}

export function dedupeByKey (items, getKey) {
  const uniqueItems = new Map()

  for (const item of items) {
    const key = getKey(item)
    if (key && !uniqueItems.has(key)) {
      uniqueItems.set(key, item)
    }
  }

  return [...uniqueItems.values()]
}

export function dedupeComboboxOptions (options) {
  return dedupeByKey(options, option => option.value)
}
