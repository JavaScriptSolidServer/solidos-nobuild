import { html } from 'lit'
import FormControlComponent from '../../lib/FormControlComponent.js'
import { define } from '../../lib/define.js'
import { showDialog } from '../../lib/dialogs.js'
import PhotoCaptureModal from '../photo-capture-modal/PhotoCaptureModal.js'
import '../button/Button.js'

/** Form control whose value is a File captured from the camera. */
export default class PhotoCapture extends FormControlComponent {
  static properties = {
    heading: { type: String, reflect: true },
    captureLabel: { type: String, attribute: 'capture-label', reflect: true },
    confirmLabel: { type: String, attribute: 'confirm-label', reflect: true },
    retakeLabel: { type: String, attribute: 'retake-label', reflect: true },
    cancelLabel: { type: String, attribute: 'cancel-label', reflect: true },
    facingMode: { type: String, attribute: 'facing-mode', reflect: true },
    constraints: { type: String, reflect: true },
    captureFormat: { type: String, attribute: 'capture-format', reflect: true },
    captureQuality: { type: Number, attribute: 'capture-quality' },
    showCancelButton: { type: Boolean, attribute: 'show-cancel-button', reflect: true },
    fileNamePrefix: { type: String, attribute: 'file-name-prefix', reflect: true },
    mediaConstraints: { attribute: false },
  }

  constructor () {
    super()

    this.label = 'Take Photo'
    this.heading = 'Take a photo'
    this.captureLabel = 'Take Photo'
    this.confirmLabel = 'Use Photo'
    this.retakeLabel = 'Retake'
    this.cancelLabel = 'Cancel'
    this.facingMode = 'user'
    this.constraints = ''
    this.captureFormat = 'image/png'
    /** @type {number | undefined} */
    this.captureQuality = undefined
    this.showCancelButton = true
    this.fileNamePrefix = ''
    /** @type {MediaStreamConstraints | undefined} */
    this.mediaConstraints = undefined
  }

  render () {
    return html`
        <slot name="trigger" @click=${this.onClick}>
            <solid-ui-button ?disabled="${this.disabled}">${this.label}</solid-ui-button>
        </slot>
    `
  }

  onClick () {
    showDialog(PhotoCaptureModal, {
      props: {
        name: this.name,
        heading: this.heading,
        captureLabel: this.captureLabel,
        confirmLabel: this.confirmLabel,
        retakeLabel: this.retakeLabel,
        cancelLabel: this.cancelLabel,
        fileNamePrefix: this.fileNamePrefix,
        mediaConstraints: this.mediaConstraints,
        constraints: this.constraints,
        captureFormat: this.captureFormat,
        captureQuality: this.captureQuality,
        showCancelButton: this.showCancelButton,
        facingMode: this.facingMode,
      },
      onClose: value => this.controlTrait.setValue(value ?? null),
    })
  }
}

define('solid-ui-photo-capture', PhotoCapture)
