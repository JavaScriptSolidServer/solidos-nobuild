export const FILE_EXPLORER_BACK_EVENT = 'solid-ui-file-explorer-back'

export const FILE_EXPLORER_MANAGE_ACCESS_EVENT = 'solid-ui-file-explorer-manage-access'

export const FILE_EXPLORER_OPEN_PANE_EVENT = 'solid-ui-file-explorer-open-pane'

/** Whether an event belongs to this explorer rather than a nested one. */
export function isExplorerEvent (event, provider) {
  return event.composedPath().find(target =>
    'localName' in target && target.localName === 'solid-ui-file-explorer-provider'
  ) === provider
}
