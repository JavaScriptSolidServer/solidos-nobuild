import { html } from 'lit'
import WebComponent from '../../lib/WebComponent.js'
import { define } from '../../lib/define.js'
import { loadSheet } from '../../lib/css.js'
import '../../lib/icons.js'

const styles = await loadSheet(new URL('./SolidEmblem.styles.css', import.meta.url))

export default class SolidEmblem extends WebComponent {
  static styles = styles

  render () {
    return html`<icon-app-solid-emblem></icon-app-solid-emblem>`
  }
}

define('solid-ui-solid-emblem', SolidEmblem)
