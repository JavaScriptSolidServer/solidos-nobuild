// When a server refuses a write's format, send the same triples in one it accepts.
//
// Panes write Turtle (ACLs in particular). A server may store some resources in
// one canonical format and answer other formats with 415 + Accept-Put — JSS does
// this for ACLs, which it keeps as JSON-LD. Every pane writes through rdflib's
// Fetcher.webOperation, so wrapping that one method covers them all: on a 415 for
// an RDF body, if the server accepts JSON-LD, re-serialise and retry once.
//
// The JSON-LD is written here: an exact mapping from the parsed triples, compacted
// with well-known prefixes only (acl:, foaf:, …) in an @context, the way servers
// write their own ACLs. Compact keys matter: JSS's ACL reader looks for literal
// `acl:agent`/`acl:mode` keys rather than expanding JSON-LD, so a fully expanded
// ACL would parse as granting no one anything. (rdflib's own JSON-LD serializer
// doesn't load from its CDN build.)

import { graph, parse } from 'rdflib'

const RDF_BODY = /^(text\/turtle|text\/n3|application\/n-triples)\b/i
const RDF_TYPE = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type'
const XSD_STRING = 'http://www.w3.org/2001/XMLSchema#string'
const RDF_LANG_STRING = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#langString'

const PREFIXES = {
  acl: 'http://www.w3.org/ns/auth/acl#',
  foaf: 'http://xmlns.com/foaf/0.1/',
  rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
  rdfs: 'http://www.w3.org/2000/01/rdf-schema#',
  vcard: 'http://www.w3.org/2006/vcard/ns#',
  dct: 'http://purl.org/dc/terms/',
  ldp: 'http://www.w3.org/ns/ldp#',
  solid: 'http://www.w3.org/ns/solid/terms#',
  xsd: 'http://www.w3.org/2001/XMLSchema#',
}

/** Triples (rdflib statements) → JSON-LD: @context of the prefixes used, @graph of nodes. */
export function toJsonLd (statements) {
  const used = new Set()
  const compact = (iri) => {
    for (const [prefix, ns] of Object.entries(PREFIXES)) {
      const local = iri.slice(ns.length)

      if (iri.startsWith(ns) && /^[A-Za-z_][\w.-]*$/.test(local)) {
        used.add(prefix)

        return `${prefix}:${local}`
      }
    }

    return iri
  }
  const nodes = new Map()
  const id = (term) => term.termType === 'BlankNode' ? `_:${term.value}` : compact(term.value)
  const node = (term) => {
    const key = id(term)

    if (!nodes.has(key)) nodes.set(key, { '@id': key })

    return nodes.get(key)
  }
  const object = (term) => {
    if (term.termType === 'Literal') {
      const value = { '@value': term.value }

      if (term.language) value['@language'] = term.language
      else if (term.datatype && ![XSD_STRING, RDF_LANG_STRING].includes(term.datatype.value)) value['@type'] = compact(term.datatype.value)

      return value
    }

    if (term.termType === 'Collection') return { '@list': term.elements.map(object) }

    return { '@id': id(term) }
  }

  for (const { subject, predicate, object: o } of statements) {
    const n = node(subject)

    if (predicate.value === RDF_TYPE && o.termType !== 'Literal') {
      (n['@type'] ??= []).push(id(o))
    } else {
      (n[compact(predicate.value)] ??= []).push(object(o))
    }
  }

  const context = Object.fromEntries([...used].sort().map(prefix => [prefix, PREFIXES[prefix]]))

  return JSON.stringify({ '@context': context, '@graph': [...nodes.values()] }, null, 2)
}

/** Install on a Fetcher (idempotent). */
export function installWriteFallback (fetcher) {
  if (!fetcher || fetcher.__writeFallback) return

  const original = fetcher.webOperation.bind(fetcher)

  fetcher.__writeFallback = true
  fetcher.webOperation = async function (method, uri, options = {}) {
    // webOperation mutates options (body, headers); keep what we need first.
    const body = options.data ?? options.body
    const contentType = options.contentType ?? ''

    try {
      return await original(method, uri, options)
    } catch (error) {
      const response = error?.response
      const accepted = response?.headers?.get?.('accept-put') || response?.headers?.get?.('accept') || ''

      if (response?.status !== 415 || !['PUT', 'POST'].includes(method) || typeof body !== 'string' ||
        !RDF_BODY.test(contentType) || !/application\/(ld\+)?json/i.test(accepted)) {
        throw error
      }

      const target = String(uri?.value ?? uri)
      const parsed = graph()

      parse(body, parsed, target, contentType.split(';')[0].trim())

      const jsonld = toJsonLd(parsed.statements)

      console.info(`write-fallback: ${method} <${target}> refused ${contentType} (415); retrying as application/ld+json`)

      const { headers, ...rest } = options
      const retryHeaders = { ...(headers ?? {}) }

      delete retryHeaders['content-type']
      delete retryHeaders['Content-Type']

      return original(method, uri, { ...rest, data: jsonld, body: jsonld, contentType: 'application/ld+json', headers: retryHeaders })
    }
  }
}
