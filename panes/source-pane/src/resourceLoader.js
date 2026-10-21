import { ns } from 'solid-ui'
import { log } from './debug.js'
// (type-only import removed: EditorMetadata from './types.js')
import { LiveStore, NamedNode } from 'rdflib'
import { happy } from './helpers.js'

export function getResponseMetadata (store, subject, response) {
  let contentType
  let eTag

  if (response.headers && response.headers.get('content-type')) {
    contentType = response.headers.get('content-type')?.split(';')[0] ?? undefined // Should work but headers may be empty
    eTag = response.headers.get('etag') ?? undefined
  } else {
    const reqs = store.each(
      null,
      store.sym('http://www.w3.org/2007/ont/link#requestedURI'),
      subject
    )
    reqs.forEach((req) => {
      const responseNode = store.any(
        req,
        store.sym('http://www.w3.org/2007/ont/link#response')
      )
      if (responseNode && responseNode.termType === 'NamedNode') {
        contentType = store.anyValue(responseNode, ns.httph('content-type')) || undefined
        eTag = store.anyValue(responseNode, ns.httph('etag')) || undefined
        if (!eTag) log('sourcePane: No eTag on GET')
      }
    })
  }

  return { contentType, eTag }
}

export async function fetchContentAndMetadata(store, subject) {
  const fetcher = store.fetcher

  try {
    const response = await fetcher.webOperation('GET', subject.uri)
    if (!happy(response, 'GET')) {
      throw new Error('GET request failed')
    }

    const content = (response).responseText
    if (content === undefined) { // Defensive https://github.com/linkeddata/rdflib.js/issues/506
      throw new Error('source pane: No text in response object!!')
    }

    const metadata = getResponseMetadata(store, subject, response)
    if (!metadata.contentType) {
      throw new Error('Error: No content-type available!')
    }
    return { content, metadata }
  } catch (error) {
    throw new Error(`Error reading file: ${error.message}`)
  }

}
