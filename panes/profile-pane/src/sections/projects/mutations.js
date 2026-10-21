import { LiveStore, NamedNode, Node, st, sym } from 'rdflib'
import { ns } from 'solid-ui'
// (type-only import removed: ProjectMutationPlan, ProjectRow from './types.js')
// (type-only import removed: MutationOps, RdfStatement from '../shared/types.js')
import {
	isRdfListNode,
	projectUrlFromCommunityNode,
	expandCommunityNodes
} from '../shared/projectCommunityNodes.js'
import {
	projectsMutationSaveFailedDebugText,
	saveProjectsUpdatesFailedMessageText
} from '../../texts.js'
import { runUpdateTransport } from '../shared/rdfMutationHelpers.js'
import { error as debugError } from '../../utils/debug.js'

function toProjectUrlNode(project) {
	const value = (project.url || '').trim()
	if (!value) return null
	try {
		return sym(new URL(value).href)
	} catch {
		return null
	}
}

function normalizeProjectUrlKey(value) {
	const text = (value || '').trim()
	if (!text) return ''
	try {
		const parsed = new URL(text)
		parsed.hash = ''
		return parsed.href
	} catch {
		return text
	}
}

function collectListChainNodes(store, listHead, doc) {
	if (!store.any(listHead, ns.rdf('first'), null, doc)) return []

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
		current = rest
	}

	return nodes
}

function collectCommunityCleanupStatements(store, statement, fallbackDoc) {
	const doc = (statement.why) || fallbackDoc
	const cleanup = [st(statement.subject, statement.predicate, statement.object, doc)]
	const objectNode = statement.object

	if (isRdfListNode(store, objectNode, doc)) {
		collectListChainNodes(store, objectNode, doc).forEach((listNode) => {
			cleanup.push(...store.statementsMatching(listNode, null, null, doc))
		})
		return cleanup
	}

	if (objectNode.termType === 'BlankNode') {
		cleanup.push(...store.statementsMatching(objectNode, null, null, doc))
	}

	return cleanup
}

async function mutateProjectEntries(store, subject, projectOps) {
	const doc = subject.doc()

	const existingLinks = store.statementsMatching(subject, ns.solid('community'), null, null)
	const batchesByDoc = new Map()
	const docKeyByUrl = new Map()
	const touchedDocs = new Set()

	const getDocBatch = (targetDoc) => {
		const existing = batchesByDoc.get(targetDoc.value)
		if (existing) return existing
		const next = { doc: targetDoc, cleanupStatements: [], currentUrlsByKey: new Map() }
		batchesByDoc.set(targetDoc.value, next)
		return next
	}

	existingLinks.forEach((statement) => {
		const targetDoc = (statement.why) || doc
		const batch = getDocBatch(targetDoc)
		batch.cleanupStatements.push(...collectCommunityCleanupStatements(store, statement, doc))

		const objectNode = statement.object
		const communityNodes = expandCommunityNodes(store, objectNode, targetDoc)

		communityNodes.forEach((communityNode) => {
			const url = projectUrlFromCommunityNode(communityNode, store)
			const key = normalizeProjectUrlKey(url)
			if (!key || docKeyByUrl.has(key)) return
			docKeyByUrl.set(key, targetDoc.value)
			batch.currentUrlsByKey.set(key, url)
		})
	})

	const ensureDocTouched = (docKey) => {
		touchedDocs.add(docKey)
	}

	const removeExistingUrl = (key) => {
		const targetDocKey = docKeyByUrl.get(key)
		if (!targetDocKey) return null
		const batch = batchesByDoc.get(targetDocKey)
		if (!batch) return null
		batch.currentUrlsByKey.delete(key)
		docKeyByUrl.delete(key)
		ensureDocTouched(targetDocKey)
		return batch.doc
	}

	const addUrlToDoc = (targetDoc, url) => {
		const key = normalizeProjectUrlKey(url)
		if (!key || docKeyByUrl.has(key)) return
		const batch = getDocBatch(targetDoc)
		batch.currentUrlsByKey.set(key, url)
		docKeyByUrl.set(key, targetDoc.value)
		ensureDocTouched(targetDoc.value)
	}

	projectOps.remove.forEach((project) => {
		const entryKey = normalizeProjectUrlKey(project.entryNode || '')
		const urlKey = normalizeProjectUrlKey(project.url)
		if (entryKey) {
			removeExistingUrl(entryKey)
			return
		}
		if (urlKey) {
			removeExistingUrl(urlKey)
		}
	})

	projectOps.update.forEach((project) => {
		const newLink = toProjectUrlNode(project)
		const entryKey = normalizeProjectUrlKey(project.entryNode || '')
		const urlKey = normalizeProjectUrlKey(project.url)
		const removedDoc = (entryKey && removeExistingUrl(entryKey)) || (urlKey && removeExistingUrl(urlKey)) || doc
		if (newLink) {
			addUrlToDoc(removedDoc, newLink.value)
		}
	})

	projectOps.create.forEach((project) => {
		const newLink = toProjectUrlNode(project)
		if (!newLink) return
		addUrlToDoc(doc, newLink.value)
	})

	for (const docKey of touchedDocs) {
		const batch = batchesByDoc.get(docKey)
		if (!batch) continue
		const insertions = Array.from(batch.currentUrlsByKey.values()).map((url) => st(subject, ns.solid('community'), sym(url), batch.doc))
		await runUpdateTransport(store, batch.doc, batch.cleanupStatements, insertions, {
			unsupportedMessage: 'Project updates are not supported by this store updater.',
			failureMessage: 'Failed to save projects',
			useDavFallback: true,
			usePutFallback: true
		})
	}
}

export async function processProjectsMutations(store, subject, mutationPlan) {
	try {
		await mutateProjectEntries(store, subject, mutationPlan)
	} catch (err) {
		const rootError = err instanceof Error ? err : new Error(String(err))
		debugError(projectsMutationSaveFailedDebugText, rootError)
		throw new Error(saveProjectsUpdatesFailedMessageText, { cause: rootError })
	}
}
