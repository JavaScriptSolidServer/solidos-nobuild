import { ContextConsumer, ContextProvider } from '@lit/context'
import { html,} from 'lit'
import { consume, provide } from '@lit/context'
import { NamedNode } from 'rdflib'
// (type-only import removed: DataBrowserContext from 'pane-registry')
import { getStatusSection } from '../../StatusSection.js'
import { warn } from '../../debug.js'
import { WebComponent } from 'solid-ui'
import { solidLogicSingleton } from 'solid-logic'
import { sourceContext } from '../../primitives/context.js'
// (type-only import removed: SourcePaneState, EditorMetadata from '../../types.js')

import { DEFAULT_FILE_EXPLORER_CONTEXT, fileExplorerContext,} from 'solid-ui'

function createDefaultSourcePaneState() {
  return {
    broken: false
  }
}

function createDefaultEditorMetadata() {
  return {
    contentType: undefined,
    eTag: undefined
  }
}

function createSourceContextValue(input) {
  return {
    dataLoaded: input.dataLoaded,
    resourceUri: input.resourceUri,
    originalContent: input.originalContent,
    sourcePaneState: input.sourcePaneState,
    editorMetadata: input.editorMetadata,
    updateSourcePaneState: input.updateSourcePaneState,
    updateContent: input.updateContent,
    updateMetadata: input.updateMetadata,
  }
}

export default class SourceProvider extends WebComponent {
  static properties = {
    context: { attribute: false },
    subject: { attribute: false },
    originalContent: { state: true },
    dataLoaded: { state: true },
    sourcePaneState: { state: true },
    editorMetadata: { state: true },
  }

  constructor () {
    super()
    this.__sourceContextValueProvider = new ContextProvider(this, { context: sourceContext })
    this.context = undefined
    this.subject = undefined
    this.fileExplorerContext = DEFAULT_FILE_EXPLORER_CONTEXT
    new ContextConsumer(this, { ...{ context: fileExplorerContext, subscribe: true }, callback: (value) => { this.fileExplorerContext = value } })
    this.originalContent = undefined
    this.dataLoaded = false
    this.sourcePaneState = createDefaultSourcePaneState()
    this.editorMetadata = createDefaultEditorMetadata()
    this.sourceContextValue = createSourceContextValue({
      dataLoaded: false,
      resourceUri: undefined,
      originalContent: undefined,
      sourcePaneState: createDefaultSourcePaneState(),
      editorMetadata: createDefaultEditorMetadata(),
      updateSourcePaneState: () => {},
      updateContent: () => {},
      updateMetadata: () => {},
    })
  }

  get sourceContextValue () {
    return this.__sourceContextValue
  }

  set sourceContextValue (value) {
    this.__sourceContextValueProvider.setValue(value)
    this.__sourceContextValue = value
  }

  loadGeneration = 0

  loadContentAndMetadata = async () => {
    if (!this.context || !this.subject) return

    const subjectUri = this.subject.uri
    const loadGeneration = ++this.loadGeneration

    try {
      const { content, metadata } = await solidLogicSingleton.resource.fetchContentAndMetadata(this.subject)
      if (this.subject?.uri !== subjectUri || loadGeneration !== this.loadGeneration) return

      this.originalContent = content
      this.updateEditorMetadata(metadata)
      this.dataLoaded = true
    } catch (error) {
      warn('Failed to load source content', error)
      if (!this.isConnected) return
      const { showError } = getStatusSection(this.closest('.sourcePane') ?? this)
      showError(error.message)
    }
  }

  refreshSourceContextValue() {
    const resourceUri = this.subject?.uri
    const updateContent = (content) => {
      if (this.subject?.uri !== resourceUri) return
      this.updateOriginalContent(content)
    }

    this.sourceContextValue = createSourceContextValue({
      dataLoaded: this.dataLoaded,
      resourceUri,
      originalContent: this.originalContent,
      sourcePaneState: this.sourcePaneState,
      editorMetadata: this.editorMetadata,
      updateSourcePaneState: this.updateSourcePaneState,
      updateContent,
      updateMetadata: this.updateEditorMetadata,
    })
  }

  unregisterEditor
  registeredWith
  _editingRequested = false
  _childObserver

  updateSourcePaneState = (key, value) => {
    this.sourcePaneState = {
      ...this.sourcePaneState,
      [key]: value
    }
  }

  updateOriginalContent = (content) => {
    this.originalContent = content
  }

  updateEditorMetadata = (metadata) => {
    this.editorMetadata = {
      contentType: metadata.contentType,
      eTag: metadata.eTag
    }
  }

  beginEditing = () => {
    const editorCard = this.querySelector('source-pane-source-editor-card')
    if (editorCard) {
      editorCard.beginEditing()
    } else {
      this._editingRequested = true
    }
  }

  applyPendingEditing () {
    if (!this._editingRequested) return
    const editorCard = this.querySelector('source-pane-source-editor-card')
    if (!editorCard) return
    this._editingRequested = false
    editorCard.beginEditing()
  }

  refreshEditorRegistration () {
    if (!this.isConnected) return

    const context = this.fileExplorerContext
    const registerEditor = !context || context === DEFAULT_FILE_EXPLORER_CONTEXT ? undefined : context.registerEditor
    // Context values change with dirty/editing state; the provider's registrar is stable.
    if (this.registeredWith === registerEditor) return

    this.unregisterEditor?.()
    this.unregisterEditor = undefined
    this.registeredWith = undefined

    if (registerEditor) {
      this.unregisterEditor = context.registerEditor(this)
      this.registeredWith = registerEditor
    }
  }

  connectedCallback () {
    super.connectedCallback()
    this._childObserver = new MutationObserver(() => this.applyPendingEditing())
    this._childObserver.observe(this, { childList: true })
    this.requestUpdate()
  }

  disconnectedCallback () {
    this._childObserver?.disconnect()
    this._childObserver = undefined
    this.unregisterEditor?.()
    this.unregisterEditor = undefined
    this.registeredWith = undefined
    super.disconnectedCallback()
  }

  willUpdate (changedProperties) {
    super.willUpdate(changedProperties)
    if (!this.context) {
      throw new Error('The element is missing the required `context` property.')
    }

    if (changedProperties.has('context') || changedProperties.has('subject')) {
      this.loadGeneration++
      this.dataLoaded = false
    }

    if (
      changedProperties.has('context') ||
      changedProperties.has('subject') ||
      changedProperties.has('dataLoaded') ||
      changedProperties.has('originalContent') ||
      changedProperties.has('sourcePaneState') ||
      changedProperties.has('editorMetadata')
    ) {
      this.refreshSourceContextValue()
    }
  }

  updated (changedProperties) {
    super.updated(changedProperties)
    this.refreshEditorRegistration()

    if (changedProperties.has('context') || changedProperties.has('subject')) {
      void this.loadContentAndMetadata()
    }
  }

  render () {
    return html`<slot></slot>`
  }
}

if (!customElements.get('source-pane-source-provider')) customElements.define('source-pane-source-provider', SourceProvider)
