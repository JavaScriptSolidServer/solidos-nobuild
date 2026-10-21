// Everything in solid-ui's design system. Upstream's src/components/index.ts.
//
// Make sure that <solid-ui-provider> is registered first, so that contexts are
// available to nested components when they mount. Static imports can't promise
// that here: every component awaits its stylesheet, so they finish in any order.
// ContextRoot covers the rest: a consumer that asks before its provider is
// defined gets answered once the provider arrives.

import { ContextRoot } from '@lit/context'

new ContextRoot().attach(document.documentElement)

await import('./components/provider/Provider.js')

await Promise.all([
  import('./components/account/Account.js'),
  import('./components/auth-buttons.js'),
  import('./components/avatar/Avatar.js'),
  import('./components/button/Button.js'),
  import('./components/combobox/Combobox.js'),
  import('./components/combobox-option/ComboboxOption.js'),
  import('./components/dialog/Dialog.js'),
  import('./components/dialog-parts.js'),
  import('./components/dialog-provider/DialogProvider.js'),
  import('./components/dialogs-root/DialogsRoot.js'),
  import('./components/guard/Guard.js'),
  import('./components/input/Input.js'),
  import('./components/login-modal/LoginModal.js'),
  import('./components/menu/Menu.js'),
  import('./components/menu-item/MenuItem.js'),
  import('./components/photo-capture/PhotoCapture.js'),
  import('./components/photo-capture-modal/PhotoCaptureModal.js'),
  import('./components/rdf-form/RDFForm.js'),
  import('./components/rdf-input/RDFInput.js'),
  import('./components/select/Select.js'),
  import('./components/select-option/SelectOption.js'),
  import('./components/solid-emblem/SolidEmblem.js'),
])

export { showDialog } from './lib/dialogs.js'
export { authContext } from './lib/auth/context.js'
export { storeContext } from './lib/forms.js'
