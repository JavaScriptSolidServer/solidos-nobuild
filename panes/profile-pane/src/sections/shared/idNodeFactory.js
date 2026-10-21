import { NamedNode, sym } from 'rdflib'

let lastIssuedTimestamp = 0

export function createIdNode(doc) {
  const now = Date.now()
  const timestampId = now > lastIssuedTimestamp ? now : lastIssuedTimestamp + 1
  lastIssuedTimestamp = timestampId
  return sym(`${doc.uri}#id${timestampId}`)
}
