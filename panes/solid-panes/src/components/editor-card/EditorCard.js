import { loadSheet } from '../../loadSheet.js'
import { html } from 'lit'
import { WebComponent,} from 'solid-ui'
const styles = await loadSheet(new URL('./EditorCard.styles.css', import.meta.url))

export default class EditorCard extends WebComponent {
  static properties = {
    contentType: {},
    content: {},
  }

  get _editorMount () {
    return this.renderRoot?.querySelector('.editor') ?? null
  }

  static styles = styles

  _editor
  _initializing = false

  getEditor () {
    return this._editor
  }

  setReadOnly (readOnly) {
    this._editor?.setReadOnly(readOnly)
  }

  async _initializeEditor () {
    if (this._editor || this._initializing) return
    this._initializing = true
    const editorDiv = this._editorMount

    if (!editorDiv) {
      this._initializing = false
      return
    }

    try {
      const { CodeEditor } = await import('solid-ui')
      this._editor = new CodeEditor()
      try {
        await this._editor.initialize(editorDiv, this.content ?? '', this.contentType ?? '', 'dark')
      } catch (err) {
        throw new Error(`Error initializing code editor: ${err instanceof Error ? err.message : String(err)}`)
      }
      this._editor?.setReadOnly(true)
    } catch (err) {
      // TODO: Bring in error handling and debug
      console.log('Error loading CodeEditor module:', err)
    } finally {
      this._initializing = false
    }
  }

  async firstUpdated () {
    await this._initializeEditor()
  }

  disconnectedCallback () {
    super.disconnectedCallback()
    if (this._editor) {
      this._editor.destroy()
      this._editor = undefined
    }

    this._initializing = false
  }

  render () {
    return html`
      <section class="editor-card">
        <div class="editor"></div>
      </section>
    `
  }
}

if (!customElements.get('solid-panes-editor-card')) customElements.define('solid-panes-editor-card', EditorCard)
