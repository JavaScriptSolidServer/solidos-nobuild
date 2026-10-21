import { BlankNode, Collection, LiveStore, NamedNode, Node, st, sym, literal } from 'rdflib'
import { ns } from 'solid-ui'
// (type-only import removed: LanguageRow from './types.js')
// (type-only import removed: MutationOps, PrefixCapable, RdfFetcher, RdfStatement, RdfUpdater from '../shared/types.js')
import { presentLanguages } from './selectors.js'
import { expandRdfList } from '../shared/rdfList.js'
import { createIdNode } from '../shared/idNodeFactory.js'
import { languageMutationSaveFailedDebugText, saveLanguageUpdatesFailedMessageText } from '../../texts.js'
import { findExistingNode, registerStorePrefix, runUpdateTransport } from '../shared/rdfMutationHelpers.js'
import { error as debugError } from '../../utils/debug.js'

// Language entries are serialized as an ordered rdf:List of id nodes, where
// each id node points to an IANA URI via solid:publicId.
const LANGUAGE_IANA_NS = 'https://www.w3.org/ns/iana/language-code/'

function ensureLanguagePrefix(store) {
  registerStorePrefix(store, 'l', LANGUAGE_IANA_NS)
  registerStorePrefix((store.updater)?.store, 'l', LANGUAGE_IANA_NS)
}

function normalizeText(value) {
  return (value || '').trim()
}

function normalizeLanguageCode(value) {
  const normalized = normalizeText(value).toLowerCase()
  if (!normalized) return ''

  if (normalized.startsWith(LANGUAGE_IANA_NS)) {
    return normalized.slice(LANGUAGE_IANA_NS.length)
  }

  return normalized
}

function rowsFromOrderedInput(orderedRows) {
  return (orderedRows || [])
    .filter((row) => row.status !== 'deleted')
    .filter((row) => Boolean(normalizeText(row.publicId) || normalizeText(row.name) || normalizeText(row.entryNode)))
    .map((row) => ({
      ...row,
      name: normalizeText(row.name),
      publicId: normalizeText(row.publicId),
      proficiency: normalizeText(row.proficiency),
      entryNode: normalizeText(row.entryNode)
    }))
}

function nodeKey(node) {
  return `${node.termType}:${node.value}`
}

function isLanguageEntryNode(node) {
  return Boolean(node && (node.termType === 'NamedNode' || node.termType === 'BlankNode'))
}

function buildLanguageStatements(
  store,
  subject,
  doc,
  rows,
  existingLanguageNodes
) {
  const languageRows = rows
    .map((row) => ({
      name: normalizeText(row.name),
      publicId: normalizeLanguageCode(row.publicId),
      entryNode: normalizeText(row.entryNode)
    }))
    .filter((row) => Boolean(row.publicId))

  if (languageRows.length === 0) {
    return { statements: [], entryNodes: []}
  }

  const entryNodes = languageRows.map((row) => {
    const existingNode = row.entryNode
      ? findExistingNode(existingLanguageNodes, row.entryNode)
      : null

    if (isLanguageEntryNode(existingNode)) {
      return existingNode
    }

    return createIdNode(doc)
  })
  const statements = []

  statements.push(st(subject, ns.schema('knowsLanguage'), new Collection(entryNodes), doc))

  entryNodes.forEach((entryNode, index) => {
    const publicIdNode = sym(`${LANGUAGE_IANA_NS}${languageRows[index].publicId}`)
    statements.push(st(entryNode, ns.solid('publicId'), publicIdNode, doc))
    const existingNameStatement = store.holds(publicIdNode, ns.schema('name'), literal(languageRows[index].name, 'en'), doc)
    if (languageRows[index].name && !existingNameStatement) {
      statements.push(st(publicIdNode, ns.schema('name'), literal(languageRows[index].name, 'en'), doc))
    }
  })

  return { statements, entryNodes }
}

function collectListChainNodes(store, listHead, doc) {
  const visited = new Set()
  const nodes = []
  let current = listHead

  while (current) {
    const key = `${current.termType}:${current.value}`
    if (visited.has(key)) break
    visited.add(key)
    nodes.push(current)

    const rest = store.any(current, ns.rdf('rest'), null, doc)
    if (!rest || (rest.termType === 'NamedNode' && rest.value === ns.rdf('nil').value)) {
      break
    }
    current = (rest.termType === 'NamedNode' || rest.termType === 'BlankNode') ? rest : null
  }

  return nodes
}

function mergeLanguageOps(existingRows, languageOps) {
  const byEntryNode = new Map()
  existingRows.forEach((row) => {
    byEntryNode.set(row.entryNode, row)
  })

  languageOps.remove.forEach((row) => {
    if (!row.entryNode) return
    byEntryNode.delete(row.entryNode)
  })

  languageOps.update.forEach((row) => {
    if (!row.entryNode) return
    if (!byEntryNode.has(row.entryNode)) return
    byEntryNode.set(row.entryNode, row)
  })

  languageOps.create.forEach((row) => {
    if (!normalizeText(row.publicId)) return
    byEntryNode.set(`new:${row.name}:${Math.random()}`, {
      ...row,
      publicId: normalizeText(row.publicId),
      proficiency: normalizeText(row.proficiency)
    })
  })

  const dedupedByLanguage = new Map()
  Array.from(byEntryNode.values()).forEach((row) => {
    const publicId = normalizeText(row.publicId)
    if (!publicId) return
    if (!dedupedByLanguage.has(publicId)) {
      dedupedByLanguage.set(publicId, {
        ...row,
        publicId,
        proficiency: normalizeText(row.proficiency)
      })
    }
  })

  return Array.from(dedupedByLanguage.values())
}

async function mutateLanguageEntries(
  store,
  subject,
  languageOps,
  orderedRows
) {
  ensureLanguagePrefix(store)
  const doc = subject.doc()
  const existingRows = presentLanguages(subject, store).map((detail) => ({
    name: normalizeText(detail.name),
    publicId: normalizeText(detail.publicId),
    proficiency: normalizeText(detail.proficiency),
    entryNode: detail.entryNode.value,
    status: 'existing'
  }))
  const nextRows = orderedRows && orderedRows.length
    ? rowsFromOrderedInput(orderedRows)
    : mergeLanguageOps(existingRows, languageOps)

  const listObjects = store.each(subject, ns.schema('knowsLanguage'), null, doc)
  const existingListHeads = listObjects.filter((node) => node.termType === 'BlankNode' || node.termType === 'NamedNode')
  const canForcePut = Boolean(
    (store.updater)?.serialize &&
    (store.fetcher)?.webOperation
  )
  const shouldForcePut = canForcePut

  const existingListNodes = Array.from(new Map(
    existingListHeads
      .flatMap((node) => collectListChainNodes(store, node, doc))
      .map((node) => [`${node.termType}:${node.value}`, node])
  ).values())

  const existingLanguageNodes = Array.from(new Set(
    listObjects
      .flatMap((node) => expandRdfList(store, node))
      .filter((node) => node.termType === 'NamedNode' || node.termType === 'BlankNode')
      .map((node) => `${node.termType}:${node.value}`)
  )).map((key) => {
    const [termType, ...rest] = key.split(':')
    const value = rest.join(':')
    return termType === 'BlankNode' ? store.bnode(value) : store.sym(value)
  })

  const {
    statements: insertions,
    entryNodes: nextEntryNodes
  } = buildLanguageStatements(store, subject, doc, nextRows, existingLanguageNodes)

  const retainedEntryNodeKeys = new Set(nextEntryNodes.map((node) => nodeKey(node)))
  const retainedLanguageNodes = existingLanguageNodes.filter((node) => retainedEntryNodeKeys.has(nodeKey(node)))
  const removedLanguageNodes = existingLanguageNodes.filter((node) => !retainedEntryNodeKeys.has(nodeKey(node)))

  const removedPublicIdNodes = Array.from(new Map(
    removedLanguageNodes
      .map((node) => store.any(node, ns.solid('publicId'), null, doc))
      .filter((node) => Boolean(node && node.termType === 'NamedNode'))
      .map((node) => [nodeKey(node), node])
  ).values())

  const deletions = store.statementsMatching(subject, ns.schema('knowsLanguage'), null, doc)
  existingListNodes.forEach((node) => {
    deletions.push(...store.statementsMatching(node, null, null, doc))
  })
  removedLanguageNodes.forEach((node) => {
    deletions.push(...store.statementsMatching(node, null, null, doc))
  })
  retainedLanguageNodes.forEach((node) => {
    deletions.push(...store.statementsMatching(node, ns.solid('publicId'), null, doc))
  })
  removedPublicIdNodes.forEach((node) => {
    deletions.push(...store.statementsMatching(node, ns.schema('name'), null, doc))
  })

  await runUpdateTransport(store, doc, deletions, insertions, {
    unsupportedMessage: 'Language updates are not supported by this store updater.',
    failureMessage: 'Failed to save languages',
    forcePut: shouldForcePut,
    useDavFallback: !shouldForcePut,
    usePutFallback: true
  })
}

export async function processLanguageMutations(
  store,
  subject,
  mutationPlan,
  orderedRows
) {
  try {
    await mutateLanguageEntries(store, subject, mutationPlan, orderedRows)

  } catch (error) {
    const rootError = error instanceof Error ? error : new Error(String(error))
    debugError(languageMutationSaveFailedDebugText, rootError)
    throw new Error(saveLanguageUpdatesFailedMessageText, { cause: rootError })
  }
}
