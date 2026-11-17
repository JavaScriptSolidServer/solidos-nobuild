import { defineAsyncComboboxOptionsProvider,} from '../combobox/index.js'
import { directoryEntryOptionTemplate } from './AccessControlAddAccess.js'
import { label } from '../../utils/label.js'
import { DEFAULT_DIRECTORY_SOURCES, solidLogicSingleton,} from 'solid-logic'
import { sym } from 'rdflib'
import { html } from 'lit'
import ns from '../../lib/ns.js'
import '../../lib/icons.js'
import { dedupeByKey, dedupeComboboxOptions, isAbsoluteHttpUri, isOriginUrl, normalizeOriginInput,} from './helpers.js'

async function classifyAccessTarget (principal) {
  const normalizedOrigin = normalizeOriginInput(principal)
  if (normalizedOrigin) {
    return { kind: 'origin', subjectValue: normalizedOrigin }
  }

  if (isOriginUrl(principal)) {
    return { kind: 'origin', subjectValue: new URL(principal).origin }
  }

  return await solidLogicSingleton.acl.classifyAccessControlSubject(principal)
}

async function resolveAccessTargetLabel (
  resolvedPrincipal,
  preferredLabel
) {
  if (!resolvedPrincipal || resolvedPrincipal.kind === 'origin') {
    return resolvedPrincipal?.subjectValue
  }

  const subject = sym(resolvedPrincipal.subjectValue)
  await solidLogicSingleton.store.fetcher.load(subject.doc())
  const resolvedLabel = preferredLabel?.trim() || label(subject).trim()
  if (!resolvedLabel || resolvedLabel === resolvedPrincipal.subjectValue) {
    throw new Error('The access target has no usable display label.')
  }

  return resolvedLabel
}

export async function resolveAccessTarget (
  principal,
  preferredLabel
) {
  const resolvedPrincipal = await classifyAccessTarget(principal)
  if (!resolvedPrincipal) {
    return undefined
  }

  const resolvedLabel = await resolveAccessTargetLabel(resolvedPrincipal, preferredLabel)
  if (!resolvedLabel) {
    return undefined
  }

  return {
    subjectType: resolvedPrincipal.kind,
    subjectValue: resolvedPrincipal.subjectValue,
    label: resolvedLabel,
    targetKind: resolvedPrincipal.kind === 'origin' ? 'origin' : undefined
  }
}

async function createUrlOption (uri) {
  const resolved = await resolveAccessTarget(uri)
  return resolved
    ? { label: resolved.label, value: uri }
    : undefined
}

function directoryEntryToOption (entry, labelValue) {
  return {
    label: labelValue,
    value: entry.uri,
    template: directoryEntryOptionTemplate({ ...entry, label: labelValue })
  }
}

async function getPreferredAccessPrincipalOptions (query) {
  const normalizedOrigin = normalizeOriginInput(query)
  if (normalizedOrigin) {
    return [{
      label: `Use origin ${normalizedOrigin}`,
      value: normalizedOrigin,
      targetKind: 'origin',
      template: html`<span class="access-grants-directory-entry"><icon-lucide-globe style="width: 13px; height: 13px; flex: 0 0 13px;"></icon-lucide-globe><span>Use origin ${normalizedOrigin}</span></span>`
    }]
  }

  if (!isAbsoluteHttpUri(query)) {
    return []
  }

  if (isOriginUrl(query)) {
    return [{
      label: `Use origin ${new URL(query).origin}`,
      value: new URL(query).origin,
      targetKind: 'origin',
      template: html`<span class="access-grants-directory-entry"><icon-lucide-globe style="width: 13px; height: 13px; flex: 0 0 13px;"></icon-lucide-globe><span>Use origin ${new URL(query).origin}</span></span>`
    }]
  }

  const urlOption = await createUrlOption(query)
  return dedupeComboboxOptions(urlOption ? [urlOption] : [])
}

async function getTrustedAppOptions (query) {
  try {
    const me = solidLogicSingleton.authn.currentUser()
    if (!me) return []
    await solidLogicSingleton.profile.loadProfile(me)
    const store = solidLogicSingleton.store
    const apps = store.each(me, ns.acl('trustedApp'))
    return apps.flatMap(app => {
      const origin = store.any(app, ns.acl('origin'))
      if (!origin || !isOriginUrl(origin.value)) return []
      const normalizedOrigin = new URL(origin.value).origin
      if (query && !`${normalizedOrigin} trusted app`.toLowerCase().includes(query.toLowerCase())) return []
      return [{
        label: `Trusted app: ${normalizedOrigin}`,
        value: normalizedOrigin,
        targetKind: 'trustedApp',
        template: html`<span class="access-grants-directory-entry"><icon-lucide-globe style="width: 13px; height: 13px; flex: 0 0 13px;"></icon-lucide-globe><span>Trusted app: ${normalizedOrigin}</span></span>`
      }]
    })
  } catch {
    return []
  }
}

function getShortQueryOptions (preferredOptions) {
  if (preferredOptions.length) {
    return preferredOptions
  }

  return [{
    label: 'Type at least 2 characters to search',
    value: '',
    selectable: false
  }]
}

export const accessPrincipalOptionsProvider =
  defineAsyncComboboxOptionsProvider(async (filter) => {
    const query = filter.trim()
    const preferredOptions = await getPreferredAccessPrincipalOptions(query)
    const trustedAppOptions = await getTrustedAppOptions(query)

    if (query.length < 2) {
      return dedupeByKey(
        [...preferredOptions, ...trustedAppOptions, ...getShortQueryOptions(preferredOptions)],
        option => {
          const targetOption = option
          return typeof targetOption.value === 'string'
            ? `${targetOption.value}:${targetOption.targetKind ?? 'default'}`
            : undefined
        }
      )
    }

    let entries = []

    try {
      entries = await solidLogicSingleton.directory.search({
        query,
        sources: DEFAULT_DIRECTORY_SOURCES
      })
    } catch (error) {
      if (!preferredOptions.length && !trustedAppOptions.length) {
        throw error
      }
    }

    const verifiedEntries = await Promise.all(entries.map(async entry => {
      try {
        const resolved = await resolveAccessTarget(entry.uri, entry.label)
        return resolved ? { entry, label: resolved.label } : undefined
      } catch {
        return undefined
      }
    }))
    const options = verifiedEntries
      .filter((entry) => entry !== undefined)
      .map(({ entry, label: entryLabel }) => directoryEntryToOption(entry, entryLabel))
    return dedupeByKey(
      [...preferredOptions, ...trustedAppOptions, ...options],
      option => {
        const targetOption = option
        return typeof targetOption.value === 'string'
          ? `${targetOption.value}:${targetOption.targetKind ?? 'default'}`
          : undefined
      }
    )
  })
