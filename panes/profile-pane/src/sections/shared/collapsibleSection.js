import { scheduleDescriptionOverflowCheck } from './sectionCardHelpers.js'

export function toggleCollapsibleSection(event) {
  const button = event.currentTarget
  const section = button?.closest('.profile-section-collapsible')
  const panel = section?.querySelector('.profile-section-collapsible__content')
  if (!button || !section || !panel) return

  const nextExpanded = section.getAttribute('data-expanded') !== 'true'
  section.setAttribute('data-expanded', String(nextExpanded))
  button.setAttribute('aria-expanded', String(nextExpanded))
  panel.setAttribute('aria-hidden', String(!nextExpanded))
  panel.hidden = !nextExpanded

  if (nextExpanded && typeof window !== 'undefined') {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        scheduleDescriptionOverflowCheck()
      })
    })
  }
}