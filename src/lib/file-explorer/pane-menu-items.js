

async function resolvePaneIcon (
  pane,
  subject,
  context,
  override
) {
  if (override) return override(subject, context)
  return typeof pane.icon === 'function'
    ? pane.icon(subject, context)
    : pane.icon
}

export async function preparePaneMenuItems (
  input
) {
  const items = await Promise.all(input.panes.map(async pane => {
    const label = pane.label(input.subject, input.context)
    if (!label) return undefined

    const icon = await resolvePaneIcon(
      pane,
      input.subject,
      input.context,
      input.iconOverrides?.[pane.name]
    )

    const item = {
      key: pane.name,
      label,
      ...(icon ? { icon } : {}),
      action: (event) => input.openPane(input.subject, pane.name, event)
    }
    return item
  }))

  return items.filter((item) => item !== undefined)
}
