import { importCss } from './importCss.js'
import { html } from 'lit'
importCss(new URL('./StatusSection.css', import.meta.url))

export function getStatusSection(){
  function showError(message) {
    const statusSection = document.querySelector('.sourcePaneStatus')
    const statusMessageArea = statusSection?.querySelector('#statusMessageArea')
    if (statusSection) {
      statusSection.dataset.visible = 'true'
    }
    if (statusMessageArea) {
      statusMessageArea.hidden = false
      const errorText = statusMessageArea.querySelector('.error-text')
      if (errorText) {
        errorText.textContent = message
      }
    }
  }

  function clearError() {
    const statusSection = document.querySelector('.sourcePaneStatus')
    const statusMessageArea = statusSection?.querySelector('#statusMessageArea')
    if (statusSection) {
      statusSection.dataset.visible = 'false'
    }
    if (statusMessageArea) {
      statusMessageArea.hidden = true
      const errorText = statusMessageArea.querySelector('.error-text')
      if (errorText) {
        errorText.textContent = ''
      }
    }
  }

  function renderStatusSection() {
    const statusMessage = ''

    return html`
      <section class="sourcePaneStatus" role="alert" data-visible="false">
        <div id="statusMessageArea" hidden>
          <p class="error-text">${statusMessage}</p>
          <button class="statusCloseButton" aria-label="Dismiss error" @click=${() => clearError()}>X</button>
        </div>
      </section>
    `
  }
  return {
    renderStatusSection,
    showError,
    clearError
  }
}
