import { html, nothing } from 'lit'
import { DialogComponent } from '../../lib/dialogs.js'
import { define } from '../../lib/define.js'
import { loadSheet } from '../../lib/css.js'
import '../button/Button.js'
import '../dialog/Dialog.js'
import '../dialog-parts.js'

const styles = await loadSheet(new URL('./PhotoCaptureModal.styles.css', import.meta.url))

/** Camera preview → capture → confirm. Closes with the captured File. */
export default class PhotoCaptureModal extends DialogComponent {
  static styles = styles

  static properties = {
    name: { type: String, reflect: true },
    heading: { type: String, reflect: true },
    captureLabel: { type: String, reflect: true },
    confirmLabel: { type: String, reflect: true },
    retakeLabel: { type: String, reflect: true },
    cancelLabel: { type: String, attribute: 'cancel-label', reflect: true },
    fileNamePrefix: { type: String, attribute: 'file-name-prefix', reflect: true },
    mediaConstraints: { attribute: false },
    constraints: { type: String, reflect: true },
    captureFormat: { type: String, attribute: 'capture-format', reflect: true },
    captureQuality: { type: Number, attribute: 'capture-quality' },
    showCancelButton: { type: Boolean, attribute: 'show-cancel-button', reflect: true },
    facingMode: { type: String, attribute: 'facing-mode', reflect: true },
    errorMessage: { state: true },
    previewUrl: { state: true },
    startingPreview: { state: true },
    value: { state: true },
  }

  constructor () {
    super()

    this.name = ''
    this.heading = 'Take a photo'
    this.captureLabel = 'Take Photo'
    this.confirmLabel = 'Use Photo'
    this.retakeLabel = 'Retake'
    this.cancelLabel = 'Cancel'
    this.fileNamePrefix = ''
    /** @type {MediaStreamConstraints | undefined} */
    this.mediaConstraints = undefined
    this.constraints = ''
    this.captureFormat = 'image/png'
    /** @type {number | undefined} */
    this.captureQuality = undefined
    this.showCancelButton = true
    this.facingMode = 'user'
    this.errorMessage = ''
    this.previewUrl = ''
    this.startingPreview = false
    /** @type {File | null} */
    this.value = null
    /** @type {MediaStream | null} */
    this.stream = null
  }

  disconnectedCallback () {
    this.stopStream()
    this.revokePreviewUrl()
    super.disconnectedCallback()
  }

  willUpdate (changed) {
    super.willUpdate(changed)

    if (changed.has('value')) {
      const normalizedValue = this.value instanceof File ? this.value : null

      if (normalizedValue !== this.value) {
        this.value = normalizedValue

        return
      }

      this.syncPreviewFromValue(normalizedValue)
    }
  }

  updated (changed) {
    super.updated(changed)

    if (
      !this.value &&
      !this.stream &&
      !this.startingPreview &&
      (changed.has('previewUrl') || changed.has('value'))
    ) {
      this.queuePreviewStart()
    }

    if (this.stream) {
      const video = this.shadowRoot?.querySelector('video')

      if (video && video.srcObject !== this.stream) {
        video.srcObject = this.stream
      }
    }
  }

  render () {
    return html`
        <solid-ui-dialog title=${this.heading}>
            <solid-ui-dialog-content>
                ${this.renderViewport()}
                ${this.renderStatus()}
            </solid-ui-dialog-content>
            <solid-ui-dialog-footer>
                ${this.showCancelButton
                    ? html`<solid-ui-button variant="secondary" @click=${() => this.close()}>${this.cancelLabel}</solid-ui-button>`
                    : nothing
                }
                ${this.value
                  ? html`
                    <solid-ui-button @click=${this.onRetake}>${this.retakeLabel}</solid-ui-button>
                    <solid-ui-button @click=${this.onConfirm}>${this.confirmLabel}</solid-ui-button>
                  `
                  : html`
                    <solid-ui-button
                        ?disabled=${this.startingPreview || !this.stream}
                        @click=${this.onCapture}
                    >
                        ${this.captureLabel}
                    </solid-ui-button>
                  `
                }
            </solid-ui-dialog-footer>
        </solid-ui-dialog>
    `
  }

  renderViewport () {
    const contents = this.previewUrl
      ? html`<img src="${this.previewUrl}" alt="Captured photo preview" />`
      : html`<video autoplay playsinline muted></video>`

    return html`<div class="viewport">${contents}</div>`
  }

  renderStatus () {
    if (this.errorMessage) return html`<div class="status error">${this.errorMessage}</div>`
    if (this.startingPreview) return html`<div class="status">Opening camera…</div>`
    if (!this.value) return html`<div class="status">Preview the camera and take a photo when ready.</div>`

    return html`<div class="status">Review the photo before confirming it.</div>`
  }

  onRetake () {
    this.clearValue()
    this.queuePreviewStart()
  }

  onConfirm () {
    if (!this.value) return

    this.close(this.value)
  }

  async onCapture () {
    const video = this.shadowRoot?.querySelector('video')

    if (!video) return

    const width = video.videoWidth || video.clientWidth || 640
    const height = video.videoHeight || video.clientHeight || 480
    const canvas = document.createElement('canvas')

    canvas.width = width
    canvas.height = height

    const context = canvas.getContext('2d')

    if (!context) {
      this.errorMessage = 'Unable to capture a photo in this browser'

      return
    }

    context.drawImage(video, 0, 0, width, height)

    const blob = await new Promise(resolve => {
      canvas.toBlob(resolve, this.captureFormat, this.captureQuality)
    })

    if (!blob) {
      this.errorMessage = 'Unable to create an image from the current camera frame'

      return
    }

    this.value = this.createFileFromBlob(blob)
    this.errorMessage = ''
  }

  createFileFromBlob (blob) {
    const contentType = blob.type || this.captureFormat
    const extension = this.fileExtensionForMimeType(contentType)
    const safePrefix = (this.fileNamePrefix || this.name || 'photo').trim() || 'photo'

    return new File([blob], `${safePrefix}-${Date.now()}.${extension}`, { type: contentType })
  }

  fileExtensionForMimeType (mimeType) {
    switch (mimeType) {
      case 'image/jpeg':
        return 'jpg'
      case 'image/webp':
        return 'webp'
      case 'image/gif':
        return 'gif'
      default:
        return 'png'
    }
  }

  queuePreviewStart () {
    this.startPreview().catch(() => undefined)
  }

  stopStream () {
    if (!this.stream) return

    this.stream.getTracks().forEach(track => track.stop())
    this.stream = null

    const video = this.shadowRoot?.querySelector('video')

    if (video) {
      video.srcObject = null
    }
  }

  syncPreviewFromValue (file) {
    this.revokePreviewUrl()

    if (!file) return

    this.stopStream()
    this.previewUrl = URL.createObjectURL(file)
  }

  clearValue () {
    this.value = null
    this.errorMessage = ''
  }

  revokePreviewUrl () {
    if (this.previewUrl) {
      URL.revokeObjectURL(this.previewUrl)
    }

    this.previewUrl = ''
  }

  async startPreview () {
    if (this.value || this.startingPreview) return

    if (!navigator.mediaDevices?.getUserMedia) {
      this.errorMessage = 'Camera access is not available in this browser'

      return
    }

    this.startingPreview = true
    this.errorMessage = ''

    try {
      const stream = await navigator.mediaDevices.getUserMedia(this.resolveMediaConstraints())

      this.stream = stream
      this.requestUpdate()

      await this.updateComplete

      const video = this.shadowRoot?.querySelector('video')

      if (video) {
        video.srcObject = stream
        await video.play?.().catch(() => undefined)
      }
    } catch (error) {
      this.errorMessage = error?.message || 'Unable to start the camera preview'
    } finally {
      this.startingPreview = false
    }
  }

  resolveMediaConstraints () {
    if (this.mediaConstraints) return this.mediaConstraints

    if (this.constraints) {
      try {
        return JSON.parse(this.constraints)
      } catch (error) {
        throw new Error(`Invalid constraints JSON: ${error.message}`)
      }
    }

    return {
      video: this.facingMode
        ? { facingMode: { ideal: this.facingMode } }
        : true,
    }
  }
}

define('solid-ui-photo-capture-modal', PhotoCaptureModal)
