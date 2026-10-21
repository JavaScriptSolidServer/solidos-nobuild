import { LiveStore, NamedNode, Node, sym } from 'rdflib'
import { ns } from 'solid-ui'
import { expandRdfList } from './rdfList.js'

export function isRdfListNode(store, node, doc) {
	if ((node)?.elements?.length) return true
	return Boolean(store.any(node, ns.rdf('first'), null, doc || null))
}

export function expandCommunityNodes(store, node, doc) {
	return isRdfListNode(store, node, doc) ? expandRdfList(store, node) : [node]
}

export function linkedProjectNodeFromCommunityNode(node, store) {
	if (!node) return null
	if (node.termType === 'NamedNode') return node
	if (node.termType === 'Literal') {
		try {
			return sym(node.value)
		} catch {
			return null
		}
	}
	if (node.termType !== 'BlankNode') return null

	const candidatePredicates = [
		ns.solid('publicId'),
		ns.schema('url'),
		ns.foaf('homepage'),
		ns.rdfs('seeAlso'),
		ns.schema('sameAs'),
		ns.schema('mainEntityOfPage')
	]

	for (const predicate of candidatePredicates) {
		const linked = store.any(node, predicate)
		if (!linked?.value) continue

		if (linked.termType === 'NamedNode') {
			return linked
		}

		if (linked.termType === 'Literal') {
			try {
				return sym(linked.value)
			} catch {
				// Keep trying the next predicate.
			}
		}
	}

	const outgoing = store.statementsMatching(node, null, null, null)
	const firstNamedNode = outgoing.find((statement) => statement.object.termType === 'NamedNode')
	if (firstNamedNode?.object?.value) {
		return firstNamedNode.object
	}

	return null
}

export function projectUrlFromCommunityNode(node, store) {
	const linkedProjectNode = linkedProjectNodeFromCommunityNode(node, store)
	return linkedProjectNode?.value || node.value || ''
}