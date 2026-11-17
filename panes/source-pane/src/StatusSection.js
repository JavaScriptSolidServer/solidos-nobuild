import { importCss } from './importCss.js'
import { html, nothing, render } from 'lit'
importCss(new URL('./StatusSection.css', import.meta.url))
import 'solid-ui/components/error-state'

export function getStatusSection(root = document){
  function showError(message, options = {}) {
    const statusSection = root.querySelector('.sourcePaneStatus')
    if (statusSection) {
      const currentError = statusSection.querySelector('solid-ui-error-state')
      // Preserve startup recovery actions when a background content request fails.
      if (currentError?.getAttribute('title') && !options.title) return
      statusSection.dataset.visible = 'true'
      render(html`
        <solid-ui-error-state title=${options.title ?? ''} message=${message} @close=${clearError}>
          ${options.onRetry
            ? html`<button type="button" @click=${options.onRetry}>Try again</button>`
            : nothing}
          ${options.details
            ? html`<details><summary>Technical details</summary><pre>${options.details}</pre></details>`
            : nothing}
        </solid-ui-error-state>
      `, statusSection)
    }
  }

  function showStatus(message) {
    const statusSection = root.querySelector('.sourcePaneStatus')
    if (statusSection) {
      statusSection.dataset.visible = 'true'
      render(html`<p class="sourcePaneStatusMessage">${message}</p>`, statusSection)
    }
  }

  function clearError() {
    const statusSection = root.querySelector('.sourcePaneStatus')
    if (statusSection) {
      statusSection.dataset.visible = 'false'
      render(nothing, statusSection)
    }
  }

  function renderStatusSection() {
    return html`
      <section
        class="sourcePaneStatus"
        data-visible="false"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
      </section>
    `
  }
  return {
    renderStatusSection,
    showError,
    showStatus,
    clearError
  }
}
