import { loadSheet } from '../../loadSheet.js'
import { html, nothing } from 'lit'
import { ContextConsumer } from '@lit/context'
import { NamedNode, parse, serialize } from 'rdflib'
import { WebComponent,} from 'solid-ui'
import { DEFAULT_FILE_EXPLORER_CONTEXT, fileExplorerContext } from 'solid-ui'
import { solidLogicSingleton } from 'solid-logic'
import 'solid-ui/components/button'
import { checkSyntax, happy } from '../../helpers.js'
const styles = await loadSheet(new URL('./SourceEditorCard.styles.css', import.meta.url))
import { getStatusSection } from '../../StatusSection.js'
import { compactable } from '../../compactableFormats.js'
import { sourceContext } from '../../primitives/context.js'

export default class SourceEditorCard extends WebComponent {
  static properties = {
    _editorReady: { state: true },
    _editorError: { state: true },
    sourceContext: { attribute: false },
    fileExplorerContext: { attribute: false },
  }

  constructor () {
    super()
    this._editorReady = false
    this._editorError = false
    this.sourceContext = undefined
    this.fileExplorerContext = DEFAULT_FILE_EXPLORER_CONTEXT
    // @consume + @property upstream (decorators in that order are not rewritten by tools/convert.mjs)
    new ContextConsumer(this, { context: sourceContext, subscribe: true, callback: (value) => { this.sourceContext = value } })
    new ContextConsumer(this, { context: fileExplorerContext, subscribe: true, callback: (value) => { this.fileExplorerContext = value } })
  }

  get _editorMount () {
    return this.renderRoot?.querySelector('.sourcePaneEditor') ?? null
  }

  static styles = styles

  _editor
  _originalContent
  _originalContentType
  _loadedResourceUri
  _dirtyState = false
  _initializing = false
  _syncGeneration = 0
  _syncQueue = Promise.resolve()
  _editingRequested = false

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
    this._editor?.setAccessibility?.({
      label: this._editorLabel(),
      description: readOnly
        ? 'Source content. This content is read-only until Edit is selected.'
        : 'Source editor. You can edit this content and use Save or Cancel when finished.'
    })
  }

  _editorLabel () {
    return `Source editor for ${this.sourceContext?.resourceUri ?? 'the selected resource'}`
  }

  _statusRoot () {
    return this.shadowRoot ?? this.closest('.sourcePane') ?? document
  }

  _preservePaneDuringResize (preserve) {
    const sourcePane = this.closest('.sourcePane')
    if (!sourcePane) return
    if (preserve) {
      sourcePane.setAttribute('data-preserve-pane-on-resize', 'true')
    } else {
      sourcePane.removeAttribute('data-preserve-pane-on-resize')
    }
  }

  _focusEditorAfterUpdate () {
    void this.updateComplete.then(() => this.focusEditor())
  }

  setValue (text) {
    this._editor?.replaceContent(text)
  }

  beginEditing() {
    if (!this._editorReady) {
      this._editingRequested = true
      return
    }

    this._editingRequested = false
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

  async _syncEditorToCurrentView (syncGeneration) {
    if (!this._editor) return

    this.updateEditingState(false)
    const sourceContext = this._requireSourceContext()
    this._originalContent = sourceContext.originalContent
    this._originalContentType = sourceContext.editorMetadata.contentType
    const content = sourceContext.originalContent ?? ''
    const contentType = this._originalContentType ?? 'text/turtle'
    await this._editor.setLanguage(contentType)
    if (syncGeneration !== undefined && syncGeneration !== this._syncGeneration) return
    this.setReadOnly(true)
    this._editor.replaceContent(content)
    this._editor.resetDirtyState()
    this.updateDirtyState(false)
  }

  queueEditorSynchronization () {
    const syncGeneration = ++this._syncGeneration
    this._syncQueue = this._syncQueue.then(() => this._syncEditorToCurrentView(syncGeneration))
    return this._syncQueue
  }

  updateDirtyState(dirty) {
    if (this._dirtyState === dirty) return
    this._dirtyState = dirty
    this.fileExplorerContext.setDirty(dirty)
  }

  updateEditingState(editing) {
    this._preservePaneDuringResize(editing)
    if (this._isEditing === editing) return
    this._isEditing = editing
    this.requestUpdate()
  }

  _resetEditorState() {
    this._editor?.resetDirtyState()
    this.updateDirtyState(false)
    this.updateEditingState(false)
    this.setReadOnly(true)
  }

  async _initializeEditor () {
    if (this._editor || this._initializing) return
    const sourcePaneEditor = this._editorMount
    const sourceContext = this.sourceContext
    const explorerContext = this.fileExplorerContext
    if (!sourcePaneEditor || !sourceContext?.dataLoaded ||
      !explorerContext || explorerContext === DEFAULT_FILE_EXPLORER_CONTEXT ||
      !explorerContext.store || !explorerContext.subjectUri) return

    this._initializing = true
    this._editorError = false
    getStatusSection(this._statusRoot()).clearError()
    try {
      const { CodeEditor } = await import('solid-ui')
      this._originalContent = sourceContext.originalContent
      this._originalContentType = sourceContext.editorMetadata.contentType
      this._editor = new CodeEditor()
      const { content, contentType } = await this._getViewContent()
      try {
        await this._editor.initialize(
          sourcePaneEditor,
          content,
          contentType,
          'dark',
          dirty => { this.updateDirtyState(dirty) },
          {
            label: this._editorLabel(),
            description: 'Source content. This content is read-only until Edit is selected.'
          }
        )
      } catch (err) {
        throw new Error(`Error initializing code editor: ${err instanceof Error ? err.message : String(err)}`)
      }
      this._editorReady = true
      this._loadedResourceUri = sourceContext.resourceUri
      this.setReadOnly(true)
      if (this._editingRequested) this.beginEditing()
    } catch (err) {
      this._editorReady = false
      this._editorError = true
      this._editor?.destroy()
      this._editor = undefined
      const { showError } = getStatusSection(this._statusRoot())
      showError(`Error loading code editor: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      this._initializing = false
    }
  }

  async firstUpdated () {
    await this._initializeEditor()
  }

  async updated (changedProperties) {
    if (changedProperties.has('sourceContext') && !this.sourceContext?.dataLoaded) {
      this._loadedResourceUri = undefined
      return
    }

    if ((!changedProperties.has('sourceContext') && !changedProperties.has('fileExplorerContext')) ||
      !this.sourceContext?.dataLoaded) return

    if (!this._editor) {
      this._editorError = false
      await this._initializeEditor()
    } else if (this._loadedResourceUri !== this.sourceContext.resourceUri) {
      this._loadedResourceUri = this.sourceContext.resourceUri
      await this.queueEditorSynchronization()
    }
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
    this._loadedResourceUri = undefined
  }

  async cancelHandler () {
    const sourceContext = this.sourceContext
    if (!sourceContext) return
    await this.queueEditorSynchronization()
    this._resetEditorState()
    getStatusSection(this._statusRoot()).showStatus('Source changes canceled.')
    this._focusEditorAfterUpdate()
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
    if (!checkSyntax(store, saveSubject, data, contentType, saveSubject, this._statusRoot())) {
      return
    }
    const options = { data, contentType }
    if (eTag) options.headers = { 'if-match': eTag } // avoid overwriting changed files -> status 412

    let response
    try {
      response = await fetcher.webOperation('PUT', saveSubject.uri, options)
      if (!happy(response, 'PUT', this._statusRoot())) return
    } catch (err) {
      const { showError } = getStatusSection(this._statusRoot())
      showError('Error saving back: ' + err)
      return
    }

    if (sourceContext.resourceUri === saveSubject.uri) {
      this._originalContent = data
      sourceContext.updateContent(data)
    }

    let refreshError
    try {
      if (typeof fetcher.load === 'function') {
        await fetcher.load(saveSubject, { force: true, clearPreviousData: true })
      }
      const metadataResponse = await fetcher.webOperation('HEAD', saveSubject.uri) // , defaultFetchHeaders())
      if (!metadataResponse.ok) {
        throw new Error(`HTTP error on HEAD! Status: ${metadataResponse.status}`)
      }
      const metadata = await solidLogicSingleton.resource.fetchMetadata(saveSubject)
      if (sourceContext.resourceUri === saveSubject.uri) {
        sourceContext.updateMetadata({
          contentType: metadata.contentType,
          eTag: metadata.eTag
        })
      }
    } catch (err) {
      refreshError = err
    }

    if (refreshError) {
      const { showError } = getStatusSection(this._statusRoot())
      showError('Saved, but failed to refresh metadata: ' + refreshError)
    }

    if (sourceContext.resourceUri === saveSubject.uri) {
      this._resetEditorState()
      this._focusEditorAfterUpdate()
    }
  }

  prettyHandler () {
    const sourceContext = this._requireSourceContext()

    const { contentType } = sourceContext.editorMetadata
    const compactContentType = contentType?.split(';')[0]
    const { showError } = getStatusSection(this._statusRoot())
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
    const ready = this._editorReady && this.sourceContext?.dataLoaded && !this._editorError
    const sectionClass = ready
      ? 'sourcePaneCard'
      : 'sourcePaneCard sourcePaneCardLoading'

    return html`
      <section
        class=${sectionClass}
        role="region"
        aria-busy=${ready || this._editorError ? 'false' : 'true'}
        aria-label=${this._editorLabel()}
      >
        ${ready || this._editorError ? nothing : html`
          <div class="sourcePaneCardLoadingMessage" role="status">
            Loading source editor
          </div>
        `}
        <div class="sourcePaneEditor"></div>
        ${getStatusSection().renderStatusSection()}
        ${this.renderFooter()}
      </section>
    `
  }
}

if (!customElements.get('source-pane-source-editor-card')) customElements.define('source-pane-source-editor-card', SourceEditorCard)
