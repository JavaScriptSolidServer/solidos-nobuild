// Demo only: <demo-store> provides solid-logic's store to the RDF form components,
// as upstream's StorybookProvider does (solid-ui-provider provides auth only).

import { html } from 'lit'
import { solidLogicSingleton } from 'solid-logic'
import WebComponent from '../src/lib/WebComponent.js'
import { define } from '../src/lib/define.js'
import { provide } from '../src/lib/context.js'
import { storeContext } from '../src/lib/forms.js'

define('demo-store', class extends WebComponent {
  constructor () {
    super()

    provide(this, storeContext, { store: solidLogicSingleton.store })
  }

  render () {
    return html`<slot></slot>`
  }
})
