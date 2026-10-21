import { LiveStore, NamedNode, Node, sym } from 'rdflib'
import { ns, utils, widgets } from 'solid-ui'
// (type-only import removed: ProjectDetails from './types.js')
import {
  expandCommunityNodes,
  linkedProjectNodeFromCommunityNode
} from '../shared/projectCommunityNodes.js'

function communityNodesForSubject(subject, store, doc) {
  const inProfileDoc = store.each(subject, ns.solid('community'), null, doc)
  const inAnyDoc = store.each(subject, ns.solid('community'), null, null)
  const rawNodes = [...inProfileDoc, ...inAnyDoc]

  const expandedNodes = rawNodes.flatMap((node) => expandCommunityNodes(store, node, doc))

  const seen = new Set()
  const nodes = []
  for (const node of expandedNodes) {
    const key = `${(node)?.termType || ''}:${(node)?.value || ''}`
    if (seen.has(key)) continue
    seen.add(key)
    nodes.push(node)
  }
  return nodes
}

function clearStaleRequestedState(fetcher, docUrl) {
  const requested = fetcher?.requested
  if (!requested || typeof requested !== 'object') return undefined

  const previous = requested[docUrl]
  const shouldClear =
    (typeof previous === 'string' && previous !== 'requested' && previous !== 'done') ||
    (typeof previous === 'number' && previous >= 400)

  if (shouldClear) {
    delete requested[docUrl]
  }

  return previous
}

export async function ensureProjectDocumentsLoaded(subject, store) {
  const profileDoc = subject.doc()
  const fetcher = (store)?.fetcher

  if (!fetcher || typeof fetcher.load !== 'function') {
    return
  }

  const communityNodes = communityNodesForSubject(subject, store, profileDoc)

  const docsToLoad = new Map()
  for (const node of communityNodes) {
    const linkedProjectNode = linkedProjectNodeFromCommunityNode(node, store)
    if (!linkedProjectNode) continue
    const projectDoc = linkedProjectNode.doc()
    docsToLoad.set(projectDoc.value, projectDoc)
  }

  if (!docsToLoad.size) {
    return
  }

  await Promise.all(
    Array.from(docsToLoad.values()).map(async (doc) => {
      const previousRequested = clearStaleRequestedState(fetcher, doc.value)
      try {
        void previousRequested
        await fetcher.load(doc)
      } catch {
        // Ignore individual project doc load failures so one bad doc doesn't block others.
      }
    })
  )
}

function projectNodeToUrl(node) {
  if (!node) return ''
  if ((node).termType === 'NamedNode') return (node).value || ''
  if ((node).termType === 'Literal') return (node).value || ''
  return ''
}

function normalizeUrlKey(value) {
  const text = (value || '').trim()
  if (!text) return ''
  try {
    return new URL(text).href
  } catch {
    return text
  }
}

function toProjectNamedNode(node, url) {
  if (node && node.termType === 'NamedNode') return node
  try {
    return sym(url)
  } catch {
    return null
  }
}

export async function presentProjects(subject, store) {
  await ensureProjectDocumentsLoaded(subject, store)

  const doc = subject.doc()
  const seen = new Set()
  const communityNodes = communityNodesForSubject(subject, store, doc)

  const projects = communityNodes
    .map((communityNode) => {
      const linkedProjectNode = linkedProjectNodeFromCommunityNode(communityNode, store)
      const url = linkedProjectNode?.value || projectNodeToUrl(communityNode)
      const key = normalizeUrlKey(url)
      const projectNode = linkedProjectNode || toProjectNamedNode(communityNode, url)
      const projectDoc = projectNode?.doc()

      const name = projectNode
        ? store.anyValue(projectNode, ns.foaf('name'), null, projectDoc || null) || undefined
        : undefined
      const orgName = projectNode
        ? store.anyValue(projectNode, ns.vcard('organization-name'), null, projectDoc || null) || undefined
        : undefined

      const title = name || (projectNode ? utils.label(projectNode) : utils.label(key))
      const imageUrl = projectNode
        ? widgets.findImage(projectNode) ||
          ((widgets).findImageFromURI?.(projectNode) ?? undefined)
        : undefined
      let types = []
      if (projectNode) {
        types = store.each(projectNode, ns.rdf('type'), null, projectDoc || null)
      }

      const category = types.find(
        (t) =>
          t.termType === 'NamedNode' &&
          (t.value === ns.schema('Project').value || t.value === ns.schema('Community').value)
        )

      const categoryValue =
        category?.value === ns.schema('Project').value
          ? 'project'
          : category?.value === ns.schema('Community').value
            ? 'community'
            : 'unknown'

      if (!url || !key || seen.has(key)) {
        return null
      }

      seen.add(key)

      return {
        url,
        title,
        name,
        orgName,
        imageUrl,
        category: categoryValue,
        entryNode: communityNode
      }
    })
    .filter((project) => Boolean(project))

  return projects
}
