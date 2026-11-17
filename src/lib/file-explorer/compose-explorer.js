

/**
 * Composes one explorer without touching nested explorers or owning navigation.
 * Callers register the provider/header components and render the pane content.
 */
export function composeExplorer (
  provider,
  composition
) {
  provider.context = composition.context
  provider.subjectUri = composition.subjectUri
  provider.pane = composition.pane
  provider.relevantPanes = composition.relevantPanes

  const currentHeader = provider.querySelector(
    ':scope > solid-ui-file-explorer-header'
  )
  if (composition.header) {
    const header = currentHeader ||
      provider.ownerDocument.createElement('solid-ui-file-explorer-header')
    header.paneIcon = composition.header.paneIcon
    header.menuItems = composition.header.menuItems
    header.showBack = composition.header.showBack ?? true
    if (provider.firstElementChild !== header) provider.prepend(header)
  } else {
    currentHeader?.remove()
  }

  if (composition.paneElement) {
    const paneElement = composition.paneElement
    paneElement.classList.add('paneDiv')
    const currentPane = provider.querySelector(':scope > .paneDiv')
    if (currentPane) {
      if (currentPane !== paneElement) currentPane.replaceWith(paneElement)
    } else {
      provider.appendChild(paneElement)
    }
  }
}
