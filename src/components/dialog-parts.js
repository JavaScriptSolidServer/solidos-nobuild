// solid-ui-dialog-header, -content, -footer: style-only wrappers.
// Upstream has a file per element; each only sets `static styles`.

import WebComponent from '../lib/WebComponent.js'
import { define } from '../lib/define.js'
import { loadSheet } from '../lib/css.js'

const [header, content, footer] = await Promise.all([
  loadSheet(new URL('./dialog-header/DialogHeader.styles.css', import.meta.url)),
  loadSheet(new URL('./dialog-content/DialogContent.styles.css', import.meta.url)),
  loadSheet(new URL('./dialog-footer/DialogFooter.styles.css', import.meta.url)),
])

export const DialogHeader = define('solid-ui-dialog-header', class extends WebComponent { static styles = header })
export const DialogContent = define('solid-ui-dialog-content', class extends WebComponent { static styles = content })
export const DialogFooter = define('solid-ui-dialog-footer', class extends WebComponent { static styles = footer })
