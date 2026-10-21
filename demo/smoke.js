// Load with ?smoke. Clicks through the gallery and writes PASS/FAIL lines into
// <pre id="smoke">, so headless `--dump-dom` can read the result.

const out = document.createElement('pre')
out.id = 'smoke'
document.body.append(out)

const tick = (ms = 50) => new Promise(resolve => setTimeout(resolve, ms))
const until = async (fn, ms = 5000) => { const end = Date.now() + ms; while (Date.now() < end) { const v = fn(); if (v) return v; await tick() } return null }
const click = el => el.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }))
const check = (name, ok) => { out.textContent += `${ok ? 'PASS' : 'FAIL'} ${name}\n` }

await customElements.whenDefined('solid-ui-account')
await tick(300)

// Button: form-associated submit
click(document.querySelector('#submit').shadowRoot.querySelector('button'))
await tick()
check('submit button submits its form', document.querySelector('form output').value.startsWith('submitted'))

// Account: states reflected as attributes
const [initializing, loggedOut, , alice] = document.querySelectorAll('solid-ui-account')
check('initializing state attribute', initializing.hasAttribute('data-state-initializing'))
check('logged-out shows Log In + Sign Up', loggedOut.shadowRoot.querySelectorAll('solid-ui-login-button, solid-ui-signup-button').length === 2)
check('avatar shows photo when set', !!alice.shadowRoot.querySelector('solid-ui-avatar').shadowRoot.querySelector('img[src$="alice.svg"]'))

// Log In flips the logged-out account to logged in
click(loggedOut.shadowRoot.querySelector('solid-ui-login-button solid-ui-button'))
await tick()
check('Log In → logged in', loggedOut.hasAttribute('data-state-loggedin') && !!loggedOut.shadowRoot.querySelector('solid-ui-menu'))

// Menu opens from the avatar trigger and lists the items
const menu = alice.shadowRoot.querySelector('solid-ui-menu')
click(alice.shadowRoot.querySelector('button[slot="trigger"]'))
await tick(300)
const dropdown = menu.shadowRoot.querySelector('wa-dropdown')
check('avatar opens the menu', dropdown.open === true)
check('menu has 3 items (2 custom + sign out)', menu.shadowRoot.querySelectorAll('wa-dropdown-item').length === 3)

// solid-ui-select fires on the custom item
let selected = false
const items = alice.shadowRoot.querySelectorAll('solid-ui-menu-item')
items[0].addEventListener('solid-ui-select', () => { selected = true })
click(menu.shadowRoot.querySelectorAll('wa-dropdown-item')[0])
await tick()
check('menu item fires solid-ui-select', selected)
check('menu closes after select', dropdown.open === false)

// Sign out flips back to logged out
click(alice.shadowRoot.querySelector('solid-ui-logout-button solid-ui-menu-item'))
await tick()
check('Sign out → logged out', !alice.hasAttribute('data-state-loggedin') && !!alice.shadowRoot.querySelector('solid-ui-login-button'))


// Input / Select / Combobox are form-associated: their values land in FormData
const fields = document.getElementById('fields')
const nameInput = fields.querySelector('solid-ui-input[name="name"]')
const nativeName = nameInput.shadowRoot.querySelector('input')
nativeName.value = 'Ada'
nativeName.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true }))
await tick()
check('input value reaches FormData', new FormData(fields).get('name') === 'Ada')

const select = fields.querySelector('solid-ui-select')
check('select reads its <solid-ui-select-option>s', select.options.length === 2)
let changed = null
select.addEventListener('change', e => { changed = e.detail?.option?.value })
const nativeSelect = select.shadowRoot.querySelector('select')
nativeSelect.value = 'navy'
nativeSelect.dispatchEvent(new Event('change'))
await tick()
check('select change → value, event, FormData', select.value === 'navy' && changed === 'navy' && new FormData(fields).get('colour') === 'navy')

const combobox = fields.querySelector('solid-ui-combobox')
combobox.shadowRoot.querySelector('input').focus()
await tick(100)
const option = [...combobox.shadowRoot.querySelectorAll('[role="option"]')].find(o => o.textContent.includes('Solid Web'))
option.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, composed: true }))
await tick()
check('combobox pick → value + FormData', combobox.value === 'https://solidweb.org' && new FormData(fields).get('pod') === 'https://solidweb.org')
check('read-only input is read only', fields.querySelector('solid-ui-input[readonly]').shadowRoot.querySelector('input').readOnly)

// Guard shows the right slot for the auth state
const slotted = (guard) => guard.shadowRoot.querySelector('slot').assignedNodes().map(n => n.textContent).join('')
check('guard (logged out) shows guest slot', slotted(document.getElementById('guard-out')) === 'guest slot')
check('guard (logged in) shows default slot', slotted(document.getElementById('guard-in')).includes('member slot'))

check('solid emblem renders its svg', !!document.querySelector('solid-ui-solid-emblem').shadowRoot.querySelector('icon-app-solid-emblem').shadowRoot.querySelector('svg'))

// RDF form: four text fields from demo/form.ttl, values from demo/alice.ttl
const rdf = document.getElementById('rdf')
await until(() => rdf.shadowRoot.querySelectorAll('solid-ui-rdf-input').length)
await tick(200)
const values = [...rdf.shadowRoot.querySelectorAll('solid-ui-rdf-input')].map(i => {
  const input = i.shadowRoot.querySelector('solid-ui-input')
  return `${input.label}=${input.value}`
})
check(`rdf form fields: ${values.join(' | ')}`, values.join('|') === 'Name=Alice Example|Email=mailto:alice@example.org|Nick=alice|Birthday=1990-04-01')
check('rdf form is read-only on a non-writable doc', rdf.shadowRoot.querySelector('solid-ui-rdf-input').readonly === true)

// Photo capture opens its modal (needs a dialogs root; there's no camera headless)
const root = document.createElement('solid-ui-dialogs-root')
document.body.append(root)
await tick()
click(document.querySelector('solid-ui-photo-capture').shadowRoot.querySelector('solid-ui-button'))
const modal = await until(() => root.shadowRoot.querySelector('solid-ui-photo-capture-modal'))
check('photo capture opens its modal', !!modal)
const status = await until(() => modal.shadowRoot.querySelector('.status.error, .status')?.textContent)
check(`photo modal reports camera state: "${status}"`, !!status)
click([...modal.shadowRoot.querySelectorAll('solid-ui-dialog-footer solid-ui-button')][0].shadowRoot.querySelector('button'))
check('photo modal Cancel closes it', !!await until(() => !root.shadowRoot.querySelector('solid-ui-photo-capture-modal')))

out.textContent += 'DONE\n'
