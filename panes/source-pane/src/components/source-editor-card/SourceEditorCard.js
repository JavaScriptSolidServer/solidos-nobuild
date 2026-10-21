import { loadSheet } from '../../loadSheet.js'
import { ContextConsumer } from '@lit/context'
import { html, nothing } from 'lit'
import { consume } from '@lit/context'
import { NamedNode, parse, serialize } from 'rdflib'
import { WebComponent,} from 'solid-ui'
import { fileExplorerContext,} from 'solid-ui'
import 'solid-ui/components/button'
import { checkSyntax, happy } from '../../helpers.js'
const styles = await loadSheet(new URL('./SourceEditorCard.styles.css', import.meta.url))
import { getStatusSection } from '../../StatusSection.js'
import { compactable } from '../../compactableFormats.js'
import { sourceContext } from '../../primitives/context.js'
import { getResponseMetadata } from '../../resourceLoader.js'

export default class SourceEditorCard extends WebComponent {
  static properties = {
    _editorReady: { state: true },
  }

  constructor () {
    super()
    this._editorReady = false
    this.sourceContext = undefined
    new ContextConsumer(this, { ...{ context: sourceContext, subscribe: true }, callback: (value) => { this.sourceContext = value } })
    this.fileExplorerContext = undefined
    new ContextConsumer(this, { ...{ context: fileExplorerContext, subscribe: true }, callback: (value) => { this.fileExplorerContext = value } })
  }

  get _editorMount () {
    return this.renderRoot?.querySelector('.sourcePaneEditor') ?? null
  }

  static styles = styles

  _editor
  _originalContent
  _originalContentType
  _dirtyState = false
  _initializing = false

  _isEditing = false

  _requireSourceContext () {
    if (!this.sourceContext) {
      throw new Error('The element is missing the required `sourceContext` property.')
    }

    return this.sourceContext
  }

  getOriginalContent () {
    return this._originalContent
  }

  getEditor () {
    return this._editor
  }

  focusEditor () {
    this._editor?.focusEditor()
  }

  setReadOnly (readOnly) {
    this._editor?.setReadOnly(readOnly)
  }

  setValue (text) {
    this._editor?.replaceContent(text)
  }

  beginEditing() {
    this._isEditing = true
    this.updateEditingState(true)
    this.setReadOnly(false)
    this.focusEditor()
    this.requestUpdate()
  }

  async _getViewContent() {
    const sourceContext = this._requireSourceContext()
    return {
      content: sourceContext.originalContent ?? '',
      contentType: this._originalContentType ?? sourceContext.editorMetadata.contentType ?? 'text/turtle'
    }
  }

  async _syncEditorToCurrentView() {
    if (!this._editor) return

    const { content, contentType } = await this._getViewContent()
    await this._editor.setLanguage(contentType)
    this._editor.setReadOnly(true)
    this._editor.replaceContent(content)
    this._editor.resetDirtyState()
    this.updateDirtyState(false)
  }

  updateDirtyState(dirty) {
    if (this._dirtyState === dirty) return
    this._dirtyState = dirty
    this.fileExplorerContext?.edit?.updateDirtyState?.(dirty)
  }

  updateEditingState(editing) {
    if (this._isEditing === editing) return
    this._isEditing = editing
    this.requestUpdate()
  }

  _resetEditorState() {
    this._editor?.resetDirtyState()
    this.updateDirtyState(false)
    this.updateEditingState(false)
    this._editor?.setReadOnly(true)
  }

  async _initializeEditor () {
    if (this._editor || this._initializing) return
    this._initializing = true
    const sourcePaneEditor = this._editorMount
    const sourceContext = this.sourceContext
    if (!sourcePaneEditor || !sourceContext || !this.fileExplorerContext?.store || !this.fileExplorerContext.subjectUri) {
      this._initializing = false
      return
    }
    try {
      const { CodeEditor } = await import('solid-ui')
      this._originalContent = sourceContext.originalContent
      this._originalContentType = sourceContext.editorMetadata.contentType
      this._editor = new CodeEditor()
      const { content, contentType } = await this._getViewContent()
      try {
        await this._editor.initialize(sourcePaneEditor, content, contentType, 'dark', dirty => {
          this.updateDirtyState(dirty)
        })
      } catch (err) {
        throw new Error(`Error initializing code editor: ${err instanceof Error ? err.message : String(err)}`)
      }
      this._editorReady = true
      this._editor?.setReadOnly(true)
    } catch (err) {
      const { showError } = getStatusSection()
      showError(`Error loading code editor: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      this._initializing = false
    }
  }

  async firstUpdated () {
    await this._initializeEditor()
  }

  disconnectedCallback() {
    super.disconnectedCallback()
    if (this._editor) {
      this._editor.destroy()
      this._editor = undefined
    }
    this._editorReady = false
    this._dirtyState = false
    this._initializing = false
  }

  async cancelHandler () {
    const sourceContext = this.sourceContext
    if (!sourceContext) return
    await this._syncEditorToCurrentView()
    this._resetEditorState()
  }

  async saveBack () {
    const sourceContext = this._requireSourceContext()

    const store = this.fileExplorerContext?.store
    const subjectUri = this.fileExplorerContext?.subjectUri
    if (!store || !subjectUri) {
      throw new Error('The element is missing the required `fileExplorerContext.store` or `fileExplorerContext.subjectUri` property.')
    }
    const subject = new NamedNode(subjectUri)
    const fetcher = store.fetcher
    const data = this.getEditor()?.getValue() ?? ''
    const contentType = this._originalContentType ?? sourceContext.editorMetadata.contentType ?? 'text/turtle'
    const eTag = sourceContext.editorMetadata.eTag
    const saveSubject = subject
    if (!checkSyntax(store, saveSubject, data, contentType, saveSubject)) {
      const { showError } = getStatusSection()
      showError('Syntax error: fix the document before saving.')
      return
    }
    const options = { data, contentType }
    if (eTag) options.headers = { 'if-match': eTag } // avoid overwriting changed files -> status 412
    try {
      const response = await fetcher.webOperation('PUT', saveSubject.uri, options)
      if (!happy(response, 'PUT')) return
      this._originalContent = data
      /// @@ show edited: make save button disabled until edited again.
      try {
        const response = await fetcher.webOperation('HEAD', saveSubject.uri) // , defaultFetchHeaders())
        if (!happy(response, 'HEAD')) return
        const metadata = getResponseMetadata(store, saveSubject, response)
        sourceContext.updateMetadata(metadata)
        this._resetEditorState()
      } catch (err) {
        throw err
      }
    } catch (err) {
      const { showError } = getStatusSection()
      showError('Error saving back: ' + err)
    }
  }

  prettyHandler () {
    const sourceContext = this._requireSourceContext()

    const { contentType } = sourceContext.editorMetadata
    const compactContentType = contentType?.split(';')[0]
    const { showError } = getStatusSection()
    const store = this.fileExplorerContext?.store
    const subjectUri = this.fileExplorerContext?.subjectUri
    if (!store || !subjectUri) {
      throw new Error('The element is missing the required `fileExplorerContext.store` or `fileExplorerContext.subjectUri` property.')
    }
    const subjectNode = new NamedNode(subjectUri)

    if (compactContentType && compactable[compactContentType]) {
      try {
        const text = this.getEditor()?.getValue() ?? ''
        parse(text, store, subjectNode.uri, compactContentType)
        // for jsonld serialize which is a Promise. New rdflib
        const serialized = Promise.resolve(serialize(store.sym(subjectNode.uri), store, subjectNode.uri, compactContentType))
        serialized.then(result => {
          if (typeof result === 'string') this.setValue(result)
        })
      } catch (e) {
        showError(String(e))
      }
    }
  }

  renderFooter() {
    const sourceContext = this._requireSourceContext()
    const compactContentType = sourceContext.editorMetadata.contentType?.split(';')[0]
    const showPrettyButton = !this._isEditing && !!compactContentType && compactable[compactContentType]

    if (this._isEditing) {
      return html`
        <div class="sourcePaneEditorFooter">
          <solid-ui-button class="sourcePaneCancelButton" variant="secondary" @click=${this.cancelHandler}>Cancel</solid-ui-button>
          <solid-ui-button class="sourcePaneSaveButton" variant="primary" @click=${this.saveBack}>Save Changes</solid-ui-button>
        </div>
      `
    }

    if (showPrettyButton) {
      return html`
        <div class="sourcePaneEditorFooter">
          <solid-ui-button class="sourcePanePrettyButton" variant="secondary" @click=${this.prettyHandler}>Prettify</solid-ui-button>
        </div>
      `
    }

    return nothing
  }

  render() {
    const sectionClass = this._editorReady ? 'sourcePaneCard' : 'sourcePaneCard sourcePaneCardLoading'

    return html`
      <section class=${sectionClass}>
        <div class="sourcePaneEditor"></div>
        ${this.renderFooter()}
      </section>
    `
  }
}

if (!customElements.get('source-pane-source-editor-card')) customElements.define('source-pane-source-editor-card', SourceEditorCard)
