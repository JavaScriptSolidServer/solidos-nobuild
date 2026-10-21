// Upstream lib/dialogs/* (context, Dialog, events, helpers) and
// lib/components/traits/DialogTrait + DialogComponent, in one file.

import { createContext } from '@lit/context'
import WebComponent from './WebComponent.js'
import { consume } from './context.js'
import { generateId } from './timing.js'

export const DEFAULT_DIALOG_CONTEXT = { id: `noop-${generateId()}` }
export const dialogContext = createContext(Symbol('dialog'))

export class Dialog {
  /**
   * @param {HTMLElement} element
   * @param {{ onClose?(data?: unknown): void }} [config]
   */
  constructor (element, config = {}) {
    this.id = generateId()
    this.config = config
    this.element = element
  }

  closed (data) {
    this.config.onClose?.(data)
  }
}

export class ShowDialogEvent extends Event {
  static eventName = 'solid-ui:show-dialog'

  constructor (dialog) {
    super(ShowDialogEvent.eventName, { bubbles: true, composed: true })
    this.dialog = dialog
  }
}

export class CloseDialogEvent extends Event {
  static eventName = 'solid-ui:close-dialog'

  constructor (id, data) {
    super(CloseDialogEvent.eventName, { bubbles: true, composed: true })
    this.id = id
    this.data = data
  }
}

/**
 * @template {HTMLElement} T
 * @param {new () => T} DialogComponentClass
 * @param {{ onClose?(data?: unknown): void, props?: Partial<T> }} [config]
 * @returns {T}
 */
export function showDialog (DialogComponentClass, config) {
  const element = new DialogComponentClass()

  Object.assign(element, config?.props)

  const dialog = new Dialog(element, config)

  document.dispatchEvent(new ShowDialogEvent(dialog))

  return dialog.element
}

export class DialogTrait {
  constructor (target, config) {
    this.target = target
    this.config = config
  }

  close (data) {
    window.dispatchEvent(new CloseDialogEvent(this.config.getContext().id, data))
  }
}

/** Sets `host.dialogContext` from the enclosing solid-ui-dialog-provider. */
export function consumeDialog (host) {
  return consume(host, 'dialogContext', dialogContext, DEFAULT_DIALOG_CONTEXT)
}

export class DialogComponent extends WebComponent {
  constructor () {
    super()

    consumeDialog(this)
    this.dialogTrait = this.addTrait(new DialogTrait(this, { getContext: () => this.dialogContext }))
  }

  close (result) {
    this.dialogTrait.close(result)
  }
}
