import { loadSheet } from '../../loadSheet.js'
import { customElement, WebComponent } from 'solid-ui'
import { html } from 'lit'
const styles = await loadSheet(new URL('./FolderPaneContent.styles.css', import.meta.url))

export default class FolderPaneContent extends WebComponent {
  static styles = styles

  render () {
    return html`
      <slot></slot>
    `
  }
}

if (!customElements.get('folder-pane-content')) customElements.define('folder-pane-content', FolderPaneContent)
