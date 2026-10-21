import { Task } from '@lit/task'
import { html, nothing } from 'lit'
import FormControlComponent from '../../lib/FormControlComponent.js'
import { define } from '../../lib/define.js'
import { loadSheet } from '../../lib/css.js'
import { debounce } from '../../lib/timing.js'
import '../../lib/icons.js'
import 'webawesome/components/popup/popup.js'

const styles = await loadSheet(new URL('./Combobox.styles.css', import.meta.url))

class AsyncOptionsInfo extends Error {}

/**
 * @typedef {object} ComboboxOptionData
 * @property {import('../../lib/FormControlComponent.js').FormControlValue} value
 * @property {string} label
 * @property {import('lit').TemplateResult} [template]
 * @property {boolean} [selectable]
 */

/** @typedef {(query: string) => Promise<ComboboxOptionData[]>} AsyncComboboxOptionsProvider */

export function defineAsyncComboboxOptionsProvider (provider) {
  return provider
}

export default class Combobox extends FormControlComponent {
  static styles = styles

  static properties = {
    selectOnly: { type: Boolean, reflect: true, attribute: 'select-only' },
    asyncOptionsUrl: { type: String, attribute: 'async-options-url' },
    asyncOptionsResultsField: { type: String, attribute: 'async-options-results-field' },
    asyncOptionsLabelField: { type: String, attribute: 'async-options-label-field' },
    asyncOptionsValueField: { type: String, attribute: 'async-options-value-field' },
    asyncOptionsProvider: { type: Function },
    optionsFallback: { type: Array },
    readonly: { type: Boolean, reflect: true },
    filter: { state: true },
    displayValue: { state: true },
    open: { state: true },
    activeIndex: { state: true },
  }

  constructor () {
    super()

    this.selectOnly = false
    this.asyncOptionsUrl = ''
    this.asyncOptionsResultsField = ''
    this.asyncOptionsLabelField = ''
    this.asyncOptionsValueField = ''
    /** @type {AsyncComboboxOptionsProvider | null} */
    this.asyncOptionsProvider = null
    /** @type {ComboboxOptionData[] | null} */
    this.optionsFallback = null
    this.readonly = false
    this.filter = ''
    this.displayValue = ''
    this.open = false
    this.activeIndex = -1

    this.openListenersAttached = false
    this.updateDebouncedFilter = debounce(300, (value) => (this.filter = value))
    /** @type {Task | undefined} */
    this.asyncOptionsTask = undefined
    /** @type {ComboboxOptionData | undefined} */
    this._selectedOption = undefined
    this.listboxId = `listbox-${this.controlTrait.controlId}`
  }

  /** Replaces `@query('input')`. */
  get controlElement () {
    return this.renderRoot?.querySelector('input') ?? null
  }

  get selectedOption () {
    return this._selectedOption
  }

  disconnectedCallback () {
    super.disconnectedCallback()

    this.removeOpenListeners()
  }

  willUpdate (changedProperties) {
    super.willUpdate(changedProperties)

    if (changedProperties.has('asyncOptionsUrl') || changedProperties.has('asyncOptionsProvider')) {
      this.updateAsyncOptionsTask()
    }

    if (changedProperties.has('value')) {
      const options = this.getFilteredOptions()
      const option = options.find((option) => option.selectable !== false && option.value === this.value) ??
        this.optionsFallback?.find((option) => option.value === this.value)
      const optionLabel = option?.selectable !== false && option?.label

      this.updateDisplayValue(optionLabel || this.value)

      if (this.open) {
        this.activeIndex = this.getInitialActiveIndex(options)
      }

      if (this._selectedOption && this._selectedOption.value !== this.value) {
        this._selectedOption = undefined
      }
    }
  }

  render () {
    const options = this.getFilteredOptions()
    const activeOption =
      this.open && this.activeIndex >= 0 ? options[this.activeIndex] : undefined
    const activeDescendant =
      activeOption !== undefined ? this.getOptionId(this.activeIndex) : undefined
    const accessibleName = this.placeholder || 'Combobox'

    return html`
      ${this.controlTrait.renderLabel()}
      <wa-popup
        placement="bottom"
        flip
        shift
        sync="width"
        auto-size="vertical"
        auto-size-padding="10"
        ?active=${this.open}
      >
        <div class="input-wrapper" slot="anchor" @mousedown=${this.onAnchorMouseDown}>
          <input
            id="${this.controlTrait.controlId}"
            type="text"
            name=${this.name}
            placeholder=${this.placeholder}
            role="combobox"
            aria-autocomplete="list"
            aria-haspopup="listbox"
            aria-expanded=${this.open ? 'true' : 'false'}
            aria-controls=${this.listboxId}
            aria-activedescendant=${activeDescendant ?? nothing}
            aria-labelledby=${this.label ? this.controlTrait.labelId : nothing}
            aria-label=${this.label ? nothing : accessibleName}
            aria-required=${this.required ? 'true' : nothing}
            autocomplete="off"
            spellcheck="false"
            ?required=${this.required}
            .value=${this.displayValue}
            @keydown=${this.onInputKeyDown}
            @focus=${this.onInputFocus}
            @input=${() => this.selectOnly ? this.updateDisplayValue(this.controlElement?.value ?? '') : this.controlTrait.onInput()}
          />
          <icon-lucide-chevron-down></icon-lucide-chevron-down>
        </div>
        <div
          id=${this.listboxId}
          class="listbox"
          role="listbox"
          aria-orientation="vertical"
          aria-labelledby=${this.label ? this.controlTrait.labelId : nothing}
          aria-label=${this.label ? nothing : accessibleName}
          ?hidden=${!this.open}
          @mousedown=${this.onListboxMouseDown}
        >
          ${options.map((option, index) => {
            return option.selectable !== false
              ? html`<div
                  id=${this.getOptionId(index)}
                  role="option"
                  aria-selected=${option.value === this.value ? 'true' : 'false'}
                  data-active=${index === this.activeIndex || nothing}
                  @mousemove=${() => this.setActiveIndex(index)}
                >
                  ${option.template ?? option.label}
                </div>`
              : html`<div class="non-selectable-option">${option.template ?? option.label}</div>`
          })}
        </div>
      </wa-popup>
    `
  }

  /** @returns {ComboboxOptionData[]} */
  getFilteredOptions () {
    if (this.asyncOptionsTask) {
      return this.asyncOptionsTask.render({
        initial: () => this.optionsFallback ?? [],
        complete: (options) => options,
        pending: () => [
          {
            value: '',
            label: 'Loading...',
            template: html`<icon-svg-spinners-3-dots-fade></icon-svg-spinners-3-dots-fade>`,
            selectable: false,
          },
        ],
        error: (error) => {
          const isError = !(error instanceof AsyncOptionsInfo)
          const message = Object(error).message ?? 'Something went wrong'

          return [
            {
              value: '',
              label: message,
              template: html`<span class="message message--${isError ? 'error' : 'info'}">${message}</span>`,
              selectable: false,
            },
          ]
        },
      })
    }

    return this.getOptionsFromDOM().filter((option) =>
      String(option.label).toLowerCase().includes(this.filter)
    )
  }

  getOptionsFromDOM () {
    return Array.from(this.querySelectorAll('solid-ui-combobox-option')).map((option) => ({
      value: option.value,
      label: option.textContent ?? '',
    }))
  }

  getOptionId (index) {
    return `${this.listboxId}-option-${index}`
  }

  getInitialActiveIndex (options) {
    const selectedIndex = options.findIndex((option) => option.value === this.value)

    if (selectedIndex >= 0) return selectedIndex

    return options.length > 0 ? 0 : -1
  }

  getNextIndex (currentIndex, options, direction) {
    if (options.length === 0) return -1

    return (currentIndex + direction + options.length) % options.length
  }

  setActiveIndex (index) {
    this.activeIndex = index
  }

  updateDisplayValue (value) {
    this.displayValue = value ? String(value) : ''

    if (this.open) {
      const filter = this.displayValue.toLowerCase()

      if (this.asyncOptionsTask) {
        this.updateDebouncedFilter(filter)
      } else {
        this.filter = filter
      }
    }
  }

  updateAsyncOptionsTask () {
    if (!this.asyncOptionsUrl && !this.asyncOptionsProvider) {
      this.asyncOptionsTask = undefined

      return
    }

    this.asyncOptionsTask ??= new Task(
      this,
      async ([filter]) => {
        if (this.asyncOptionsProvider) {
          const results = await this.asyncOptionsProvider(filter)

          if (results.length === 0) {
            throw new AsyncOptionsInfo('No results found')
          }

          return results
        }

        const response = await fetch(
          this.asyncOptionsUrl.replace('%search%', encodeURIComponent(filter))
        )
        const data = await response.json()
        const results = Array.from(
          this.asyncOptionsResultsField
            ? data[this.asyncOptionsResultsField]
            : data
        )

        if (results.length === 0) {
          throw new AsyncOptionsInfo('No results found')
        }

        const labelField = this.asyncOptionsLabelField || 'label'
        const valueField = this.asyncOptionsValueField || 'value'

        return results.map((result) => ({
          label: String(Object(result)[labelField]),
          value: Object(result)[valueField],
        }))
      },
      () => [this.filter]
    )
  }

  show (options) {
    if (this.open) return

    const filteredOptions = this.getFilteredOptions()

    if (filteredOptions.length === 0) return

    this.open = true
    this.activeIndex = options?.focusLast
      ? filteredOptions.length - 1
      : this.getInitialActiveIndex(filteredOptions)

    this.addOpenListeners()

    requestAnimationFrame(() => this.scrollActiveOptionIntoView())
  }

  hide () {
    if (!this.open) return

    this.filter = ''
    this.open = false
    this.activeIndex = -1

    this.removeOpenListeners()
    this.updateDebouncedFilter.cancel()
  }

  selectOption (option) {
    const previousValue = this.value

    this._selectedOption = option

    this.hide()
    this.controlTrait.setValue(option.value)
    this.controlElement?.focus({ preventScroll: true })
    this.dispatchEvent(new CustomEvent('change', { bubbles: true, composed: true, detail: { option } }))

    if (previousValue === this.value) {
      this.updateDisplayValue(option.label)
    }
  }

  scrollActiveOptionIntoView () {
    if (this.activeIndex < 0) return

    this.shadowRoot
      ?.querySelector(`#${this.getOptionId(this.activeIndex)}`)
      ?.scrollIntoView({ block: 'nearest' })
  }

  addOpenListeners () {
    if (this.openListenersAttached) return

    document.addEventListener('focusin', this.handleDocumentFocusIn)
    document.addEventListener('mousedown', this.handleDocumentMouseDown)

    const root = this.getRootNode()

    if (root !== document) {
      root.addEventListener('focusin', this.handleDocumentFocusIn)
    }

    this.openListenersAttached = true
  }

  removeOpenListeners () {
    if (!this.openListenersAttached) return

    document.removeEventListener('focusin', this.handleDocumentFocusIn)
    document.removeEventListener('mousedown', this.handleDocumentMouseDown)

    const root = this.getRootNode()

    if (root !== document) {
      root.removeEventListener('focusin', this.handleDocumentFocusIn)
    }

    this.openListenersAttached = false
  }

  handleDocumentFocusIn = (event) => {
    if (!event.composedPath().includes(this)) {
      this.hide()
    }
  }

  handleDocumentMouseDown = (event) => {
    if (!event.composedPath().includes(this)) {
      this.hide()
    }
  }

  onAnchorMouseDown (event) {
    if (event.target === this.controlElement) return

    event.preventDefault()
    this.controlElement?.focus({ preventScroll: true })
  }

  onInputFocus () {
    this.show()
  }

  openPopupFromKey (focusLast) {
    if (!this.open) {
      this.show({ focusLast })
    }
  }

  onInputKeyDown (event) {
    const options = this.getFilteredOptions()

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()

        if (!this.open) {
          this.openPopupFromKey(false)
        } else {
          this.activeIndex = this.getNextIndex(this.activeIndex, options, 1)
          this.scrollActiveOptionIntoView()
        }
        break
      case 'ArrowUp':
        event.preventDefault()

        if (!this.open) {
          this.openPopupFromKey(true)
        } else {
          this.activeIndex = this.getNextIndex(this.activeIndex, options, -1)
          this.scrollActiveOptionIntoView()
        }
        break
      case 'Enter':
        if (this.open && this.activeIndex >= 0 && options[this.activeIndex]) {
          event.preventDefault()
          this.selectOption(options[this.activeIndex])
        } else if (!this.open) {
          event.preventDefault()
          this.controlTrait.onSubmit()
        }
        break
      case 'Escape':
        if (this.open) {
          event.preventDefault()
          event.stopPropagation()
          this.hide()
          this.controlElement?.focus({ preventScroll: true })
        }
        break
      case 'Tab':
        this.hide()
        break
      default:
        if (!this.open) {
          this.show()
        }
    }
  }

  onListboxMouseDown (event) {
    event.preventDefault()

    if (!(event.target instanceof HTMLElement)) return

    const optionElement = event.target.closest('[role="option"]')

    if (!optionElement) return

    const index = Number.parseInt(optionElement.id.replace(`${this.listboxId}-option-`, ''), 10)
    const option = this.getFilteredOptions()[index]

    if (option) {
      this.selectOption(option)
    }
  }
}

define('solid-ui-combobox', Combobox)
