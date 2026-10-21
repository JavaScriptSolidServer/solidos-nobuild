import { html } from 'lit'
import { sym } from 'rdflib'
import WebComponent from '../../lib/WebComponent.js'
import { define } from '../../lib/define.js'
import ns from '../../lib/ns.js'
import { consumeStore, fetchData, findForm, sortBySequence } from '../../lib/forms.js'
import '../rdf-input/RDFInput.js'

const urlConverter = {
  fromAttribute (value) {
    if (!value) return null

    try {
      return new URL(value)
    } catch {
      return null
    }
  },
  toAttribute (value) {
    return value ?? null
  },
}

const hrefFromUrlValue = (value) => value?.href ?? ''

const TEXT_FIELDS = new Set([
  'PhoneField', 'EmailField', 'ColorField', 'DateField', 'DateTimeField', 'TimeField',
  'NumericField', 'IntegerField', 'DecimalField', 'FloatField', 'TextField',
  'SingleLineTextField', 'NamedNodeURIField',
])

// Field types upstream renders as a bare placeholder <input> for now.
const PLACEHOLDER_FIELDS = new Set([
  'MultiLineTextField', 'BooleanField', 'TristateField', 'Classifier', 'Choice',
  'Multiple', 'Options', 'AutocompleteField', 'Comment', 'Heading',
])

/** Renders a ui:Form (formUrl) against a data resource (subjectUrl). */
export default class RDFForm extends WebComponent {
  static properties = {
    passedInStore: { attribute: false },
    entireDataIsReadonly: { state: true },
    _loadVersion: { state: true },
    _documentsLoaded: { state: true },
    formUrl: { converter: urlConverter },
    subjectUrl: { converter: urlConverter },
  }

  constructor () {
    super()

    consumeStore(this)
    /** @type {import('rdflib').LiveStore | null} */
    this.passedInStore = null
    this.entireDataIsReadonly = true // to protect data, we default to not editable
    this._loadVersion = 0
    this._documentsLoaded = false
    /** @type {URL | null} */
    this.formUrl = null
    /** @type {URL | null} */
    this.subjectUrl = null
  }

  get currentStore () {
    return this.passedInStore ?? this.storeContext.store
  }

  render () {
    if (!this._documentsLoaded) return html``

    const store = this.currentStore
    const subjectUrl = hrefFromUrlValue(this.subjectUrl)

    if (subjectUrl && store.updater?.editable(subjectUrl) !== undefined && store.updater?.editable(subjectUrl) !== false) {
      this.entireDataIsReadonly = false
    }

    // If there are more 'a ui:Form' elements in a form file
    const formRoot = findForm(store, hrefFromUrlValue(this.formUrl))

    if (!formRoot) throw new Error('No ui:Form found in ' + hrefFromUrlValue(this.formUrl))

    // Fix vs upstream: they use sym(formUrl) as the graph, so a formUrl with a
    // fragment (which findForm supports) matches no parts and renders empty.
    const formDocument = sym(hrefFromUrlValue(this.formUrl)).doc()
    const parts = store.each(formRoot, ns.ui('parts'), null, formDocument)
    const partItems = (sortBySequence(store, parts) || []).flatMap(item =>
      item && typeof item === 'object' && Array.isArray(item.elements) ? item.elements : [item]
    )
    const uiFields = partItems.map(item => {
      const typeNode = store.each(item, ns.rdf('type'), null, formDocument)[0]
      const value = typeNode ? (typeNode.value || String(typeNode)) : (item.value || String(item))
      const hashIndex = value.lastIndexOf('#')

      return {
        value: item,
        fieldValue: hashIndex >= 0 ? value.slice(hashIndex + 1) : value,
      }
    })

    return html`
      <form>
        ${uiFields.map(part => {
          if (TEXT_FIELDS.has(part.fieldValue)) {
            return html` <solid-ui-rdf-input
              .formSubject=${sym(part.value)}
              .dataSubject=${sym(subjectUrl)}
              .storeVersion=${this._loadVersion}
              .readonly=${this.entireDataIsReadonly}
            ></solid-ui-rdf-input>
            <br>`
          }

          if (PLACEHOLDER_FIELDS.has(part.fieldValue)) {
            return html`<input .rdf=${part}></input>`
          }

          return html`<div>Unknown part type: ${part}</div>`
        })}
      </form>
    `
  }

  willUpdate (changedProperties) {
    super.willUpdate(changedProperties)

    if (changedProperties.has('formUrl') ||
      changedProperties.has('subjectUrl') ||
      changedProperties.has('passedInStore')
    ) {
      this.loadDocumentsIfNeeded()
    }
  }

  async loadDocumentsIfNeeded () {
    const store = this.currentStore
    const formUrl = hrefFromUrlValue(this.formUrl)
    const subjectUrl = hrefFromUrlValue(this.subjectUrl)

    if (!formUrl || !subjectUrl) return

    try {
      await fetchData(store, formUrl)
      await fetchData(store, subjectUrl)
      this._loadVersion += 1
      this._documentsLoaded = true
    } catch (error) {
      console.error('Failed to load RDF documents', error)
    }
  }
}

define('solid-ui-rdf-form', RDFForm)
