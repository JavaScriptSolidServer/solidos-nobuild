import { loadSheet } from '../../loadSheet.js'
import { ContextConsumer, ContextProvider } from '@lit/context'
import { html, nothing,} from 'lit'
import { provide } from '@lit/context'
import { consume } from '@lit/context'
import { NamedNode } from 'rdflib'
// (type-only import removed: DataBrowserContext from 'pane-registry')
import { getStatusSection } from '../../StatusSection.js'
import { warn } from '../../debug.js'
import { WebComponent } from 'solid-ui'
import { sourceContext } from '../../primitives/context.js'
// (type-only import removed: SourcePaneState, EditorMetadata from '../../types.js')

import { fetchContentAndMetadata } from '../../resourceLoader.js'
import { fileExplorerContext,} from 'solid-ui'
const styles = await loadSheet(new URL('./SourceProvider.styles.css', import.meta.url))
void import('../source-editor-card/SourceEditorCard.js').then(() => undefined)

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
    originalContent: input.originalContent,
    sourcePaneState: input.sourcePaneState,
    editorMetadata: input.editorMetadata,
    updateSourcePaneState: input.updateSourcePaneState,
    updateMetadata: input.updateMetadata,
  }
}

function createFileExplorerContextValue(input) {
  const inherited = input.parentContext ?? {}

  return {
    ...inherited,
    store: inherited.store ?? (input.context?.session.store),
    subjectUri: input.subject?.uri ?? inherited.subjectUri,
    paneSupportsEditing: inherited.paneSupportsEditing ?? true,
    edit: inherited.edit
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
    this.__fileExplorerContextValueProvider = new ContextProvider(this, { context: fileExplorerContext })
    this.__sourceContextValueProvider = new ContextProvider(this, { context: sourceContext })
    this.context = undefined
    this.subject = undefined
    this.parentFileExplorerContext = undefined
    new ContextConsumer(this, { ...{ context: fileExplorerContext, subscribe: true }, callback: (value) => { this.parentFileExplorerContext = value } })
    this.originalContent = undefined
    this.dataLoaded = false
    this.sourcePaneState = createDefaultSourcePaneState()
    this.editorMetadata = createDefaultEditorMetadata()
    this.sourceContextValue = createSourceContextValue({
      originalContent: undefined,
      sourcePaneState: createDefaultSourcePaneState(),
      editorMetadata: createDefaultEditorMetadata(),
      updateSourcePaneState: () => {},
      updateMetadata: () => {},
    })
    this.fileExplorerContextValue = createFileExplorerContextValue({
      parentContext: undefined,
      context: undefined,
      subject: undefined
    })
  }

  get sourceContextValue () {
    return this.__sourceContextValue
  }

  set sourceContextValue (value) {
    this.__sourceContextValueProvider.setValue(value)
    this.__sourceContextValue = value
  }

  get fileExplorerContextValue () {
    return this.__fileExplorerContextValue
  }

  set fileExplorerContextValue (value) {
    this.__fileExplorerContextValueProvider.setValue(value)
    this.__fileExplorerContextValue = value
  }

  get editorCard () {
    return this.renderRoot?.querySelector('source-pane-source-editor-card') ?? null
  }

  static styles = styles

  loadContentAndMetadata = async () => {
    if (!this.context || !this.subject) return

    const subjectUri = this.subject.uri

    try {
      const { content, metadata } = await fetchContentAndMetadata(this.context.session.store, this.subject)
      if (this.subject?.uri !== subjectUri) return

      this.originalContent = content
      this.updateEditorMetadata(metadata)
      this.dataLoaded = true
    } catch (error) {
      warn('Failed to load source content', error)
      const { showError } = getStatusSection()
      showError(error.message)
    }
  }

  refreshSourceContextValue() {
    this.sourceContextValue = createSourceContextValue({
      originalContent: this.originalContent,
      sourcePaneState: this.sourcePaneState,
      editorMetadata: this.editorMetadata,
      updateSourcePaneState: this.updateSourcePaneState,
      updateMetadata: this.updateEditorMetadata,
    })
  }

  refreshFileExplorerContextValue() {
    this.fileExplorerContextValue = createFileExplorerContextValue({
      parentContext: this.parentFileExplorerContext,
      context: this.context,
      subject: this.subject
    })
  }

  updateSourcePaneState = (key, value) => {
    this.sourcePaneState = {
      ...this.sourcePaneState,
      [key]: value
    }
  }

  updateEditorMetadata = (metadata) => {
    this.editorMetadata = {
      contentType: metadata.contentType,
      eTag: metadata.eTag
    }
  }

  beginEditing = () => {
    this.editorCard?.beginEditing()
  }

  willUpdate (changedProperties) {
    super.willUpdate(changedProperties)
    if (!this.context) {
      throw new Error('The element is missing the required `context` property.')
    }

    if (changedProperties.has('context') || changedProperties.has('subject')) {
      this.dataLoaded = false
    }

    if (
      changedProperties.has('context') ||
      changedProperties.has('subject') ||
      changedProperties.has('originalContent') ||
      changedProperties.has('sourcePaneState') ||
      changedProperties.has('editorMetadata')
    ) {
      this.refreshSourceContextValue()
    }

    if (
      changedProperties.has('context') ||
      changedProperties.has('subject') ||
      changedProperties.has('parentFileExplorerContext')
    ) {
      this.refreshFileExplorerContextValue()
    }
  }

  updated (changedProperties) {
    super.updated(changedProperties)

    if (changedProperties.has('context') || changedProperties.has('subject')) {
      void this.loadContentAndMetadata()
    }
  }

  render() {
    return html`
      ${this.dataLoaded
        ? html`
            <source-pane-source-editor-card></source-pane-source-editor-card>
          `
        : nothing }
    `
  }
}

if (!customElements.get('source-pane-source-provider')) customElements.define('source-pane-source-provider', SourceProvider)
