// Upstream lib/forms/{store,rdfFormsHelper,fieldParams} and lib/values,
// trimmed to what the rdf-form and rdf-input components use.

import { createContext } from '@lit/context'
import { sym, parse } from 'rdflib'
import ns from './ns.js'
import { consume } from './context.js'

export { label } from '../utils/label.js'

export function isEmptyValue (value) {
  return value === null || value === undefined || value === ''
}

// --- store context -----------------------------------------------------------

class NoopStore {
  get store () {
    throw new Error('Cannot use RDF forms without a store')
  }
}

export const DEFAULT_STORE = new NoopStore()
export const storeContext = createContext(Symbol('storeContext'))

/** Sets `host.storeContext` from the nearest store provider. */
export function consumeStore (host) {
  return consume(host, 'storeContext', storeContext, DEFAULT_STORE)
}

// --- helpers -----------------------------------------------------------------

const baseUri = 'https://solidos.github.io/solid-ui/src/ontology/'

export function loadDocument (store, documentSource, documentName, documentURI, preferRemote = false) {
  const finalDocumentUri = documentURI || baseUri + documentName
  const document = sym(finalDocumentUri)

  if (store.holds(undefined, undefined, undefined, document)) {
    store.removeStatements(store.statementsMatching(undefined, undefined, undefined, document))
  }

  const parseSource = () => new Promise((resolve, reject) => {
    parse(documentSource, store, finalDocumentUri, 'text/turtle', (err) => {
      if (err) {
        console.error('Parse document error for ', finalDocumentUri, err)
        reject(err)
      } else {
        resolve()
      }
    })
  })

  const load = () => store.fetcher.load(documentURI, { force: true, clearPreviousData: true })

  if (preferRemote && documentURI) {
    return load().then(() => {}).catch((err) => {
      if (documentSource && documentSource.trim().length > 0) return parseSource()

      throw err
    })
  }

  if (documentSource && documentSource.trim().length > 0) return parseSource()

  if (documentURI) return load().then(() => {})

  return Promise.reject(new Error(`No document source or URI for ${documentName}`))
}

export async function fetchData (store, documentURI) {
  const document = sym(documentURI)

  if (store.holds(undefined, undefined, undefined, document)) {
    store.removeStatements(store.statementsMatching(undefined, undefined, undefined, document))
  }

  return await store.fetcher.load(documentURI, { force: true, clearPreviousData: true })
}

export function sortBySequence (store, list) {
  const subfields = list.map((p) => {
    const k = store.any(p, ns.ui('sequence'))
    const seq = k ? Number(k.value) : 9999

    return [Number.isNaN(seq) ? 9999 : seq, p]
  })

  subfields.sort((a, b) => a[0] - b[0])

  return subfields.map(pair => pair[1])
}

/** The URI of the most specific known class of a form field. */
export function mostSpecificClassURI (store, subject) {
  const typeUri = store.findTypeURIs(subject)
  const specificTypes = store.bottomTypeURIs(typeUri)

  return Object.keys(specificTypes)[0]
}

// Find the first ui:Form node in a store, optionally matching a fragment.
// code based on Jeff Zucker's sol-components: https://github.com/jeff-zucker/sol-components (core/form-utils.js)
export function findForm (store, sourceUri) {
  const docUrl = sourceUri.split('#')[0]
  const fragment = sourceUri.includes('#') ? sourceUri.split('#')[1] : null

  if (fragment) {
    const candidate = sym(docUrl + '#' + fragment)

    if (store.holds(candidate, ns.rdf('type'), ns.ui('Form'))) return candidate
  }

  const forms = store.each(null, ns.rdf('type'), ns.ui('Form'))

  return forms.find((term) => term.termType === 'NamedNode') ?? null
}

// --- field params ------------------------------------------------------------
// Upstream's table also carries `size`, `style` and `pattern` for the legacy
// widgets; the web components only read type, dt, defaultInputValue, namedNode.

/**
 * @typedef {object} FieldParamsObject
 * @property {string} [type] input element type attribute, default 'text'
 * @property {string} [dt] xsd datatype for the Literal, default xsd:string
 * @property {string} [defaultInputValue] e.g. 'mailto:', stripped when displayed
 * @property {boolean} [namedNode] value is a NamedNode URI
 */

/** @type {Record<string, FieldParamsObject>} */
export const fieldParams = {
  [ns.ui('ColorField').uri]: { type: 'color', dt: 'color' },
  [ns.ui('DateField').uri]: { type: 'date', dt: 'date' },
  [ns.ui('DateTimeField').uri]: { type: 'datetime-local', dt: 'dateTime' },
  [ns.ui('TimeField').uri]: { type: 'time', dt: 'time' },
  [ns.ui('IntegerField').uri]: { dt: 'integer' },
  [ns.ui('DecimalField').uri]: { dt: 'decimal' },
  [ns.ui('FloatField').uri]: { dt: 'float' },
  [ns.ui('SingleLineTextField').uri]: {},
  [ns.ui('NamedNodeURIField').uri]: { namedNode: true },
  [ns.ui('TextField').uri]: {},
  [ns.ui('PhoneField').uri]: { defaultInputValue: 'tel:' },
  [ns.ui('EmailField').uri]: { defaultInputValue: 'mailto:' },
}
