import { widgets } from 'solid-ui'
import { formatDisplayError } from '../utils/errorDisplay.js'

export function complain (div, d, message) {
  div.appendChild(widgets.errorMessageBlock(d, formatDisplayError(message), 'pink'))
}
