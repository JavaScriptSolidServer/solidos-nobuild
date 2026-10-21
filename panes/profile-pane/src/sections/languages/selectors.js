import { NamedNode, Store, Node, LiveStore, sym } from 'rdflib'
import { ns } from 'solid-ui'
// (type-only import removed: LanguageDetails from './types.js')
import { expandRdfList } from '../shared/rdfList.js'

const IANA_LANGUAGE_BASE = 'https://www.w3.org/ns/iana/language-code/'

function normalizeText(value) {
  return value.replace(/\s+/g, ' ').trim()
}

function isRdfListNode(store, node) {
  const hasCollectionElements = Array.isArray((node)?.elements)
  if (hasCollectionElements) return true
  if (node.termType !== 'BlankNode' && node.termType !== 'NamedNode') return false
  return Boolean(store.any(node, ns.rdf('first')))
}

function normalizeLanguageCode(value) {
  return (value || '').trim().toLowerCase()
}

function languageNameFromCode(code) {
  const normalized = (code || '').trim().toLowerCase()
  if (!normalized) return ''

  try {
    const DisplayNamesCtor = (Intl)?.DisplayNames
    if (typeof DisplayNamesCtor === 'function') {
      const displayNames = new DisplayNamesCtor(['en'], { type: 'language' })
      const localized = displayNames.of(normalized)
      if (localized) return localized
    }
  } catch {
    // Fallback below.
  }

  return normalized
}

function languageNameFromPublicId(publicIdValue) {
  const value = (publicIdValue || '').trim()
  if (!value) return ''

  if (value.startsWith(IANA_LANGUAGE_BASE)) {
    const code = normalizeLanguageCode(value.slice(IANA_LANGUAGE_BASE.length))
    return languageNameFromCode(code)
  }

  return languageNameFromCode(value)
}

function englishOrAnyLiteralValue(store, subject, predicate) {
  const values = store.statementsMatching(subject, predicate)
  const english = values.find((statement) => {
    const language = (statement.object)?.lang || ''
    return language.toLowerCase().startsWith('en')
  })
  if (english && typeof (english.object)?.value === 'string') {
    return (english.object).value
  }

  const firstLiteral = values.find((statement) => statement.object?.termType === 'Literal')
  if (firstLiteral && typeof (firstLiteral.object)?.value === 'string') {
    return (firstLiteral.object).value
  }

  return ''
}

function englishLabelForNode(store, node) {
  const labels = store.statementsMatching(node, ns.rdfs('label'))
  const english = labels.find((statement) => {
    const language = (statement.object)?.lang || ''
    return language.toLowerCase().startsWith('en')
  })
  if (english && english.object && typeof (english.object).value === 'string') {
    return (english.object).value
  }
  return ''
}

function languageNameFromIanaNode(store, node) {
  const schemaName = englishOrAnyLiteralValue(store, node, ns.schema('name'))
  if (schemaName) return normalizeText(schemaName)

  const localLabel = englishLabelForNode(store, node)
  if (localLabel) return normalizeText(localLabel)

  if (node.value.startsWith(IANA_LANGUAGE_BASE)) {
    return languageNameFromPublicId(node.value)
  }

  return ''
}

function toStoredPublicIdValue(lan, publicIdNode) {
  if (publicIdNode?.termType === 'NamedNode') {
    return publicIdNode.value
  }

  if (publicIdNode?.termType === 'Literal') {
    const code = normalizeLanguageCode(publicIdNode.value)
    return code || undefined
  }

  if (lan.termType === 'NamedNode' && lan.value.startsWith(IANA_LANGUAGE_BASE)) {
    return lan.value
  }

  return undefined
}

function languageNameFromLanguageNode(store, lan, publicIdNode) {
  if (publicIdNode?.termType === 'NamedNode') {
    const nodeName = languageNameFromIanaNode(store, publicIdNode)
    if (nodeName) return nodeName
    return languageNameFromPublicId(publicIdNode.value)
  }

  if (publicIdNode?.termType === 'Literal') {
    const code = normalizeLanguageCode(publicIdNode.value)
    if (!code) return ''

    const ianaNode = sym(`${IANA_LANGUAGE_BASE}${code}`)
    const nodeName = languageNameFromIanaNode(store, ianaNode)
    if (nodeName) return nodeName
    return languageNameFromCode(code)
  }

  if (lan.termType === 'NamedNode') {
    const nodeName = languageNameFromIanaNode(store, lan)
    if (nodeName) return nodeName
  }

  return ''
}

export function languageAsText (store, lan) {
  if (lan.termType === 'Literal') return lan.value // Not normal but allow this

  if (lan.termType !== 'NamedNode' && lan.termType !== 'BlankNode') return ''

  const publicIdNode = store.any(lan, ns.solid('publicId')) || undefined
  return languageNameFromLanguageNode(store, lan, publicIdNode)
}

export function presentLanguages(subject, store) {
  const languageObjects = store.each(subject, ns.schema('knowsLanguage'))
  const expandedLists = languageObjects
    .filter((node) => isRdfListNode(store, node))
    .map((node) => expandRdfList(store, node))

  const standaloneNodes = languageObjects.filter((node) => !isRdfListNode(store, node))
  const languageNodes = [...expandedLists.flat(), ...standaloneNodes]

  const details = languageNodes
    .map((lan) => ({
      name: languageAsText(store, lan),
      publicId: toStoredPublicIdValue(lan, store.any(lan, ns.solid('publicId')) || undefined),
      proficiency: store.anyValue(lan, ns.schema('proficiencyLevel')) || undefined,
      entryNode: lan
    }))
    .filter((item) => Boolean(item.name))

  const dedupedByLanguage = new Map()
  details.forEach((item) => {
    const key = item.publicId || item.name
    if (!dedupedByLanguage.has(key)) {
      dedupedByLanguage.set(key, item)
    }
  })

  return Array.from(dedupedByLanguage.values())
}
