import { NamedNode, Node, Store } from 'rdflib'
import { ns } from 'solid-ui'

export function expandRdfList(store, node) {
  const visited = new Set()

  function inner(currentNode) {
    const termType = (currentNode).termType || typeof currentNode
    const value = (currentNode).value || String(currentNode)
    const key = `${termType}:${value}`
    if (visited.has(key)) return []
    visited.add(key)

    const collectionElements = (currentNode).elements
    if (Array.isArray(collectionElements)) {
      return collectionElements.flatMap((element) => inner(element))
    }

    const first = store.any(currentNode, ns.rdf('first'))
    if (!first) return [currentNode]

    const items = []
    let listNode = currentNode
    while (listNode) {
      const listValue = store.any(listNode, ns.rdf('first'))
      if (listValue) items.push(...inner(listValue))
      const rest = store.any(listNode, ns.rdf('rest'))
      if (!rest || (rest.termType === 'NamedNode' && rest.value === ns.rdf('nil').value)) break
      listNode = rest
    }

    return items
  }

  return inner(node)
}
