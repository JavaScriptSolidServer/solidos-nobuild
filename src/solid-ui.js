// The solid-ui package: what panes get from `import * as UI from 'solid-ui'`.
// Upstream src/index.ts, with its lib/auth, lib/components and lib/dialogs
// re-exports pointing at the hand-converted modules here.
//
// This does not register the web components; import './index.js' for those
// (upstream's CDN build does both: see src/cdn/legacy.ts).

import { solidLogicSingleton } from 'solid-logic'
import ns from './lib/ns.js'
import { installWriteFallback } from './lib/write-fallback.js'
import { acl, aclControl } from './acl/index.js'
import { create } from './create/index.js'
import { icons } from './lib/iconBase.js'
import * as language from './widgets/forms/autocomplete/language.js'
import * as log from './lib/log.js'
import { matrix } from './matrix/index.js'
import { media } from './media/index.js'
import { messageArea } from './lib/messageArea.js'
import { infiniteMessageArea } from './chat/infinite.js'
import * as pad from './lib/pad.js'
import * as participation from './lib/participation.js'
import * as preferences from './lib/preferences.js'
import { style } from './lib/style.js'
import { renderTableViewPane as table } from './lib/table.js'
import * as tabs from './lib/tabs.js'
import * as utils from './utils/index.js'
import * as login from './login/login.js'
import * as widgets from './widgets/index.js'
import { initHeader } from './header/index.js'
import { initFooter } from './footer/index.js'
import * as createTypes from './create/types.js'

// Retry a write the server refuses with 415 as JSON-LD when it accepts that
// (JSS keeps ACLs as JSON-LD); covers every pane, they all write through this fetcher.
installWriteFallback(solidLogicSingleton.store.fetcher)

export const dom = typeof window !== 'undefined' ? window.document : null // Idea that UI.dom can be adapted in non-browser environments

export {
  ns,
  acl,
  aclControl,
  create,
  createTypes,
  icons,
  language,
  log,
  login,
  matrix,
  media,
  messageArea,
  infiniteMessageArea,
  pad,
  participation,
  preferences,
  style,
  table,
  tabs,
  utils,
  widgets,
  initHeader,
  initFooter
}

// lib/auth
export { Account, NoopAuth, authContext, DEFAULT_AUTH_CONTEXT } from './lib/auth/context.js'
export { default as SolidAuth, DEFAULT_SIGNUP_URL } from './lib/auth/SolidAuth.js'

// lib/components
export { customElement } from './lib/define.js'
export { DialogComponent, DialogTrait } from './lib/dialogs.js'
export { default as FormControlComponent, FormControlTrait } from './lib/FormControlComponent.js'
export { generateId } from './lib/timing.js'
export { default as WebComponent } from './lib/WebComponent.js'

// lib/dialogs
export { Dialog, ShowDialogEvent, CloseDialogEvent, showDialog, dialogContext, DEFAULT_DIALOG_CONTEXT } from './lib/dialogs.js'

export * from './lib/file-explorer/context.js'
export * from './lib/code-editor/index.js'
