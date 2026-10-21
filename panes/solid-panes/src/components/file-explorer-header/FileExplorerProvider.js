import { loadSheet } from '../../loadSheet.js'
import { ContextProvider } from '@lit/context'
import { html, nothing,} from 'lit'

// (type-only import removed: DataBrowserContext from 'pane-registry')
import { utils, WebComponent } from 'solid-ui'
import { provide } from '@lit/context'
import { fileExplorerContext,} from 'solid-ui'
import './FileExplorerHeader.js'
const styles = await loadSheet(new URL('./FileExplorerProvider.styles.css', import.meta.url))
const personIcon = new URL('../../icons/person.svg', import.meta.url).href
const friendsIcon = new URL('../../icons/friends.svg', import.meta.url).href
import '../../icons.js'

const PERSON_ICON = personIcon
const FRIENDS_ICON = friendsIcon

function createFileExplorerContextValue (value) {
  return {
    store: value.store,
    subjectUri: value.subjectUri,
    pane: value.pane,
    soloPane: value.soloPane,
    onBack: value.onBack,
    openPane: value.openPane,
    handleAccessClick: value.handleAccessClick,
    paneSupportsEditing: value.paneSupportsEditing,
    edit: value.edit
  }
}
export default class FileExplorerProvider extends WebComponent {
  static properties = {
    context: { attribute: false },
    subjectUri: { attribute: false },
    onBack: { attribute: false },
    relevantPanes: { attribute: false },
    pane: { attribute: false },
    paneRenderOptions: { attribute: false },
    showHeader: { attribute: false },
    handleAccessClick: { attribute: false },
    soloPane: { attribute: false },
    openPane: { attribute: false },
    menuItems: { state: true },
    isEditing: { state: true },
    isDirty: { state: true },
    paneSupportsEditing: { state: true },
    edit: { state: true },
  }

  constructor () {
    super()
    this.__fileExplorerContextValueProvider = new ContextProvider(this, { context: fileExplorerContext })
    this.context = undefined
    this.subjectUri = undefined
    this.onBack = undefined
    this.relevantPanes = []
    this.pane = undefined
    this.paneRenderOptions = {}
    this.showHeader = true
    this.handleAccessClick = undefined
    this.soloPane = undefined
    this.openPane = undefined
    this.menuItems = []
    this.isEditing = false
    this.isDirty = false
    this.paneSupportsEditing = false
    this.edit = {
      onEdit: this.beginEditingInSourcePane,
      isDirty: false,
      updateDirtyState: (dirty) => {
        if (this.isDirty === dirty) return

        this.isDirty = dirty
        this.edit = {
          ...this.edit,
          isDirty: dirty
        }
        this.refreshFileExplorerContextValue()
      }
    }
    this.fileExplorerContextValue = createFileExplorerContextValue({
      store: this.context?.session.store,
      subjectUri: this.subjectUri,
      pane: this.pane,
      soloPane: this.soloPane,
      onBack: this.onBack,
      openPane: this.openPane,
      handleAccessClick: this.handleAccessClick,
      paneSupportsEditing: false,
      edit: this.edit
    })
  }

  get fileExplorerContextValue () {
    return this.__fileExplorerContextValue
  }

  set fileExplorerContextValue (value) {
    this.__fileExplorerContextValueProvider.setValue(value)
    this.__fileExplorerContextValue = value
  }

  static styles = styles

  // TODO: Need to research this more, brought it over from manager.

  // TODO: For now this works, but check if there is a better way.
  // because this means file explorer will know about the pane.
  // what if other panes want to use this. If so maybe we should
  // add more to the context to capture the provider for the pane that
  // will be editing... anyway this shouldn't be just for source pane.
  beginEditingInSourcePane = () => {
    const sourceProvider = this.querySelector('source-pane-source-provider')

    sourceProvider?.beginEditing?.()
  }

  // TODO: same as below. on Edit should be something more generic

  // Change the state for the pane so it can show the new icon.
  openSelectedPane (pane) {
    const store = this.context?.session.store
    if (!store || !this.subjectUri) return
    this.paneSupportsEditing = pane.name === 'source'
    this.pane = pane
  }

  getPaneIcon (pane, subject, context) {
    if (!pane) return undefined

    const icon = typeof pane.icon === 'function'
      ? pane.icon(subject, context)
      : pane.icon
    return icon
  }

  async getPaneItems (subject, context, relevantPanes) {
    const dom = context.dom
    const menuItems = await Promise.all(relevantPanes.map(async pane => {
      const label = pane.label(subject, context)

      let iconSrc = ''
      if (pane.name === 'profile') {
        iconSrc = PERSON_ICON
      } else if (pane.name === 'social') {
        iconSrc = FRIENDS_ICON
      } else {
        iconSrc = await this.getPaneIcon(pane, subject, context)
      }

      const icon = utils.AJARImage(iconSrc, label, label, dom)
      icon.setAttribute('slot', 'left-icon')

      return {
        label,
        icon,
        action: () => this.openPane?.(subject, pane.name)
      }
    }))
    return menuItems
  }

  refreshFileExplorerContextValue () {
    this.fileExplorerContextValue = createFileExplorerContextValue({
      store: this.context?.session.store,
      subjectUri: this.subjectUri,
      pane: this.pane,
      soloPane: this.soloPane,
      onBack: this.onBack,
      openPane: this.openPane,
      handleAccessClick: this.handleAccessClick,
      paneSupportsEditing: this.paneSupportsEditing,
      edit: this.edit
    })
  }

  async refreshMenuItems () {
    const store = this.context?.session.store
    if (!store || !this.subjectUri) return

    const subject = store.sym(this.subjectUri)
    const menuItems = await this.getPaneItems(subject, this.context, this.relevantPanes)

    this.menuItems = menuItems
  }

  willUpdate (changedProperties) {
    super.willUpdate(changedProperties)
    const store = this.context?.session.store
    if (!store) {
      throw new Error('The element is missing the required `context.session.store` value. Ensure the `context` property is set.')
    }
    if (!this.subjectUri) {
      throw new Error('The element is missing the required `subjectUri` property.')
    }

    if (
      changedProperties.has('subjectUri') ||
      changedProperties.has('relevantPanes') ||
      changedProperties.has('context')
    ) {
      this.refreshMenuItems().catch(error => {
        console.warn('Failed to refresh menu items', error)
      })
    }

    if (changedProperties.has('pane') || changedProperties.has('subjectUri') || changedProperties.has('context')) {
      this.paneSupportsEditing = this.pane?.name === 'source'
    }

    if (
      changedProperties.has('context') ||
      changedProperties.has('subjectUri') ||
      changedProperties.has('pane') ||
      changedProperties.has('soloPane') ||
      changedProperties.has('onBack') ||
      changedProperties.has('openPane') ||
      changedProperties.has('handleAccessClick') ||
      changedProperties.has('pane') ||
      changedProperties.has('isDirty')
    ) {
      this.refreshFileExplorerContextValue()
    }
  }

  render () {
    const store = this.context?.session.store
    const subject = store.sym(this.subjectUri)
    return html`
      <div class="file-explorer-provider">
        ${this.showHeader
          ? html`
              <file-explorer-header
                .paneIcon=${this.getPaneIcon(this.pane, subject, this.context)}
                .menuItems=${this.menuItems}
                .paneSupportsEditing=${this.paneSupportsEditing}
              ></file-explorer-header>
            `
          : nothing}
        <slot class="pane"></slot>
      </div>
    `
  }
}

if (!customElements.get('file-explorer-provider')) customElements.define('file-explorer-provider', FileExplorerProvider)
