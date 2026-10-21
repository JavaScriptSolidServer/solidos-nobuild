import { importCss } from '../../importCss.js'
import { html } from 'lit-html'
import { QRCodeCard } from './QRCodeCard.js'
import { LiveStore, NamedNode } from 'rdflib'
importCss(new URL('./QRCodeSection.css', import.meta.url))

export function renderQRCodeSection(subject, store) {
  return html`
      <section class="profile__section profile__qr-code" data-profile-section="qr-code" aria-labelledby="qr-heading" tabindex="-1">
        <h3 id="qr-heading" class="sr-only">QR code</h3>
        ${QRCodeCard(subject, store)}
      </section>
  `
}
