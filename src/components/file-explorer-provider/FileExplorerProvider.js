import { ContextProvider } from '@lit/context'
import { html } from 'lit-html'
import { provide } from '@lit/context'
import WebComponent from '../../lib/WebComponent.js'
// (type-only import removed: DataBrowserContext, PaneDefinition from 'pane-registry')
import { fileExplorerContext } from '../../lib/file-explorer/context.js'

export default class FileExplorerProvider extends WebComponent {
  static properties = {
    context: { attribute: false },
    subjectUri: { attribute: false },
    pane: { attribute: false },
    relevantPanes: { attribute: false },
    soloPane: { attribute: false },
  }

  constructor () {
    super()
    this.__valueProvider = new ContextProvider(this, { context: fileExplorerContext })
    this.relevantPanes = []
  }

  get value () {
    return this.__value
  }

  set value (value) {
    this.__valueProvider.setValue(value)
    this.__value = value
  }

  @state() accessor editor
  @state() accessor isDirty = false

  registerEditor = (editor) => {
    this.editor = editor
    return () => { if (this.editor === editor) this.editor = undefined }
  }

  willUpdate () {
    this.value = {
      store: this.context?.session.store,
      subjectUri: this.subjectUri,
      pane: this.pane,
      isDirty: this.isDirty,
      canEdit: !!this.editor,
      registerEditor: this.registerEditor,
      beginEditing: () => { this.editor?.beginEditing() },
      setDirty: (dirty) => { this.isDirty = dirty }
    }
  }

  render () {
    return html`<slot></slot>`
  }
}

if (!customElements.get('solid-ui-file-explorer-provider')) customElements.define('solid-ui-file-explorer-provider', FileExplorerProvider)
