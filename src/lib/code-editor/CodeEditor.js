
import { Compartment, EditorState } from '@codemirror/state'
import { EditorView, drawSelection, keymap, lineNumbers } from '@codemirror/view'
import { defaultHighlightStyle, syntaxHighlighting, StreamLanguage } from '@codemirror/language'
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { css } from '@codemirror/lang-css'
import { html } from '@codemirror/lang-html'
import { javascript } from '@codemirror/lang-javascript'
import { json } from '@codemirror/lang-json'
import { markdown } from '@codemirror/lang-markdown'
import { xml } from '@codemirror/lang-xml'
import { vscodeDark, vscodeLight } from '@uiw/codemirror-theme-vscode'
import { turtle } from '@codemirror/legacy-modes/mode/turtle'
import { sparql } from '@codemirror/legacy-modes/mode/sparql'
import { ntriples } from '@codemirror/legacy-modes/mode/ntriples'

export class CodeEditor {
  _view = null
  _languageCompartment = null
  _editableCompartment = null
  _onDirtyChange
  _isDirty = false

  async initialize (container, initialDoc = '', contentType = 'text/turtle', theme = 'dark', onDirtyChange) {
    if (this._view) {
      this._view.destroy()
    }

    this._languageCompartment = new Compartment()
    this._editableCompartment = new Compartment()
    this._onDirtyChange = onDirtyChange
    this._isDirty = false
    const languageExtension = await this._getLanguageExtension(contentType)

    const state = EditorState.create({
      doc: initialDoc,
      extensions: [
        theme === 'dark' ? vscodeDark : vscodeLight,
        EditorView.theme({
          '&': {
            minHeight: '6lh'
          }
        }),
        this._languageCompartment.of(languageExtension),
        this._editableCompartment.of(EditorView.editable.of(true)),
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
        lineNumbers(),
        history(),
        drawSelection(),
        EditorView.lineWrapping,
        EditorView.updateListener.of((update) => {
          if (update.docChanged && !this._isDirty) {
            this._isDirty = true
            this._onDirtyChange?.(true)
          }
        }),
        keymap.of([
          ...defaultKeymap,
          ...historyKeymap
        ])
      ]
    })

    this._view = new EditorView({
      state,
      parent: container
    })
  }

  destroy () {
    this._view?.destroy()
    this._view = null
    this._isDirty = false
  }

  getValue () {
    return this._view ? this._view.state.doc.toString() : ''
  }

  replaceContent (text) {
    if (!this._view) return
    const current = this._view.state.doc.toString()
    if (current === text) return
    this._view.dispatch({
      changes: { from: 0, to: this._view.state.doc.length, insert: text }
    })
  }

  resetDirtyState () {
    this._isDirty = false
  }

  setReadOnly (readOnly) {
    if (!this._view) return
    const editableCompartment = this._editableCompartment
    if (!editableCompartment) return
    this._view.dispatch({
      effects: editableCompartment.reconfigure(EditorView.editable.of(!readOnly))
    })
  }

  focusEditor () {
    this._view?.focus()
  }

  async setLanguage (contentType) {
    if (!this._view) return
    const languageCompartment = this._languageCompartment
    if (!languageCompartment) return

    const extension = await this._getLanguageExtension(contentType)
    this._view.dispatch({
      effects: languageCompartment.reconfigure(extension)
    })
  }

  async _getLanguageExtension (contentType) {
    switch (contentType) {
      case 'text/turtle':
      case 'text/n3':
        return StreamLanguage.define(turtle)

      case 'application/sparql-update':
      case 'application/sparql-query':
        return StreamLanguage.define(sparql)

      case 'application/nquads':
      case 'application/n-quads':
      case 'application/n-triples':
        return StreamLanguage.define(ntriples)

      case 'application/json':
      case 'application/ld+json':
        return json()

      case 'text/html':
      case 'application/xhtml+xml':
        return html()

      case 'text/markdown':
      case 'text/x-markdown':
      case 'text/md':
        return markdown()

      case 'application/rdf+xml':
      case 'application/xml':
        return xml()

      case 'text/css':
        return css()

      case 'text/javascript':
      case 'application/javascript':
      case 'application/ecmascript':
        return javascript()

      default:
        return []
    }
  }
}
