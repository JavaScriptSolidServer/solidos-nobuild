import { html } from 'lit-html'

export function createSpinner () {
  return html`
    <span class="loading-spinner" aria-hidden="true"></span>
    <span class="sr-only">Saving...</span>
  `
}