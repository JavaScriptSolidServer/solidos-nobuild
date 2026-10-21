import { html } from 'lit'
import { Literal, st } from 'rdflib'
import WebComponent from '../../lib/WebComponent.js'
import { define } from '../../lib/define.js'
import { generateId } from '../../lib/timing.js'
import ns from '../../lib/ns.js'
import { consumeStore, fieldParams as fieldTypeParams, label, mostSpecificClassURI } from '../../lib/forms.js'
import '../input/Input.js'

/**
 * One RDF form field bound to one value in the store.
 *
 * example RDF Turtle format source:
 *   :nameField a ui:SingleLineTextField ;
 *     ui:property vcard:fn;
 *     ui:label "name" .
 * formSubject describes the field metadata;
 * dataSubject points to the data resource containing the value.
 */
export default class RDFInput extends WebComponent {
  static properties = {
    formSubject: { attribute: false, type: Object },
    dataSubject: { attribute: false, type: Object },
    storeVersion: { type: Number },
    localInputValue: { state: true },
    readonly: { type: Boolean, reflect: true },
  }

  constructor () {
    super()

    consumeStore(this)
    /** @type {import('rdflib').NamedNode | null} */
    this.formSubject = null
    /** @type {import('rdflib').NamedNode | null} */
    this.dataSubject = null
    this.storeVersion = 0
    /** @type {string | null} */
    this.localInputValue = null
    this._updateInFlight = false
    /** @type {string | null} */
    this._pendingUpdateValue = null
    this.readonly = true // to protect data, we default to not editable
    this.id = generateId()
  }

  get store () {
    return this.storeContext.store
  }

  render () {
    const formDocument = this.getDocument(this.formSubject)

    // for building the HTML input element
    const uiPropertyTerm = this.getFormProperty(this.formSubject, ns.ui('property'), formDocument)
    const inputLabel = this.getInputLabel(this.formSubject, uiPropertyTerm, formDocument)
    const readonly = this.getReadOnly(this.readonly, this.formSubject, formDocument)
    const fieldType = this.formSubject ? mostSpecificClassURI(this.store, this.formSubject) : undefined
    const params = fieldType ? fieldTypeParams[fieldType] ?? {} : {}
    const inputType = params.type ?? 'text'

    // for populating the HTML input element
    const selectedTerm = this.getSelectedTerm(this.dataSubject, uiPropertyTerm, this.formSubject)
    const placeholder = readonly ? '' : this.defaultInputValue(params)
    const inputValue = this._updateInFlight || this._pendingUpdateValue !== null
      ? this.localInputValue ?? ''
      : this.termToInputValue(selectedTerm)

    return html`
      <solid-ui-input
        label="${inputLabel}"
        name="name-${this.id}"
        .value=${inputValue}
        .placeholder=${placeholder}
        type="${inputType}"
        ?readonly=${readonly}
        @input=${this.updateData}
      ></solid-ui-input>`
  }

  getDocument (subject) {
    return subject?.doc ? subject.doc() : undefined
  }

  getFormProperty (subject, property, graph) {
    if (!subject) return undefined

    return this.store.any(subject, property, null, graph)
  }

  getInputLabel (formFieldSubject, uiPropertyTerm, graph) {
    if (!formFieldSubject) return ''

    const uiLabel = this.store.any(formFieldSubject, ns.ui('label'), null, graph)
    const propertyLabel = uiPropertyTerm ? label(uiPropertyTerm, true) : ''

    return uiLabel ? uiLabel.value : propertyLabel
  }

  getReadOnly (readonly, formFieldSubject, graph) {
    // if readonly is false, we can override it if the field is marked as uneditable in the form
    if (formFieldSubject && readonly === false) {
      return !!this.store.anyJS(formFieldSubject, ns.ui('suppressEmptyUneditable'), null, graph)
    }

    return readonly
  }

  getSelectedTerm (dataSubject, uiPropertyTerm, formFieldSubject) {
    const defaultTerm = formFieldSubject
      ? this.store.any(formFieldSubject, ns.ui('default'))
      : undefined

    if (!uiPropertyTerm || !dataSubject) return defaultTerm

    return this.store.any(dataSubject, uiPropertyTerm) || defaultTerm
  }

  termToInputValue (term) {
    if (!term || !('value' in term) || !term.value) return ''

    try {
      return decodeURIComponent(term.value)
    } catch {
      return String(term.value)
    }
  }

  defaultInputValue (params = {}) {
    return (params.defaultInputValue ?? '').replace(/ /g, '')
  }

  async updateData (e) {
    const newValue = e.target.value

    this.localInputValue = newValue
    this._pendingUpdateValue = newValue

    if (this._updateInFlight) return

    await this.runPendingUpdate()
  }

  async runPendingUpdate () {
    if (this._pendingUpdateValue === null) return

    const newValue = this._pendingUpdateValue

    this._pendingUpdateValue = null
    this._updateInFlight = true

    const uiPropertyTerm = this.getFormProperty(this.formSubject, ns.ui('property'), this.getDocument(this.formSubject))

    if (!uiPropertyTerm || !this.dataSubject) {
      this._updateInFlight = false
      this.localInputValue = ''

      return
    }

    const dataDocument = this.getDocument(this.dataSubject)

    if (dataDocument && this.store.updater?.editable(dataDocument) === false) {
      this._updateInFlight = false

      return
    }

    const toDeleteSt = this.store.statementsMatching(this.dataSubject, uiPropertyTerm)
    let toInsertSt = []

    if (newValue) {
      let objectFromNewValue
      const fieldType = this.formSubject ? mostSpecificClassURI(this.store, this.formSubject) : undefined
      const params = fieldType ? fieldTypeParams[fieldType] ?? {} : {}

      if (params.namedNode) {
        objectFromNewValue = this.store.sym(newValue)
      } else if (params.defaultInputValue) {
        objectFromNewValue = this.store.sym(params.defaultInputValue + encodeURIComponent(newValue.replace(/ /g, '')))
      } else if (params.dt) {
        objectFromNewValue = new Literal(newValue.trim(), undefined, ns.xsd(params.dt))
      } else {
        objectFromNewValue = new Literal(newValue)
      }

      toInsertSt = toDeleteSt.map((statement) => st(statement.subject, statement.predicate, objectFromNewValue, statement.why))

      if (toInsertSt.length === 0) {
        toInsertSt = [st(this.dataSubject, uiPropertyTerm, objectFromNewValue, this.getDocument(this.dataSubject))]
      }
    }

    try {
      await this.store.updater.updateMany(toDeleteSt, toInsertSt)
      this.storeVersion += 1
    } catch (err) {
      console.error('RDFInput update failed', err)
    } finally {
      this._updateInFlight = false
    }

    if (this._pendingUpdateValue !== null) {
      await this.runPendingUpdate()
    }
  }
}

define('solid-ui-rdf-input', RDFInput)
