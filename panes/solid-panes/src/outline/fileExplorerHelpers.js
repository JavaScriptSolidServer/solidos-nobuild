import * as UI from 'solid-ui'

const personIcon = new URL('../icons/person.svg', import.meta.url).href
const friendsIcon = new URL('../icons/friends.svg', import.meta.url).href

export function getPaneIcon (
  pane,
  subject,
  context
) {
  if (!pane) return undefined

  return typeof pane.icon === 'function'
    ? pane.icon(subject, context)
    : pane.icon
}

export async function getPaneItems (
  subject,
  context,
  relevantPanes,
  dispatchOpenPane
) {
  if (typeof dispatchOpenPane !== 'function') return []

  return UI.preparePaneMenuItems({
    subject,
    context,
    panes: relevantPanes,
    iconOverrides: {
      profile: () => personIcon,
      social: () => friendsIcon
    },
    openPane: (paneSubject, paneName) => dispatchOpenPane(paneSubject, paneName)
  })
}
