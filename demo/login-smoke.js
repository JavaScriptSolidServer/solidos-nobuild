// Load login.html?smoke. Checks the real auth path up to the point where the
// browser would leave for the identity provider. Results go in <pre id="smoke">.

const out = document.createElement('pre')
out.id = 'smoke'
document.body.append(out)

const tick = (ms = 50) => new Promise(resolve => setTimeout(resolve, ms))
const click = el => el.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }))
const check = (name, ok) => { out.textContent += `${ok ? 'PASS' : 'FAIL'} ${name}\n` }
const until = async (fn, ms = 5000) => { const end = Date.now() + ms; while (Date.now() < end) { const v = fn(); if (v) return v; await tick() } return null }

const provider = document.querySelector('solid-ui-provider')
const account = document.querySelector('solid-ui-account')

check('provider initializes (authn.checkUser)', !!await until(() => provider.auth.initialized))
check('account leaves the spinner, shows Log In', !!await until(() => account.shadowRoot.querySelector('solid-ui-login-button')))

click(account.shadowRoot.querySelector('solid-ui-login-button solid-ui-button'))

const root = provider.shadowRoot.querySelector('solid-ui-dialogs-root')
const modal = await until(() => root.shadowRoot.querySelector('solid-ui-login-modal'))
check('Log In opens the login modal', !!modal)

const dialog = await until(() => modal.shadowRoot.querySelector('solid-ui-dialog')?.shadowRoot?.querySelector('dialog[open]'))
check('native <dialog> is open', !!dialog)

const combobox = modal.shadowRoot.querySelector('solid-ui-combobox')
const issuers = combobox.querySelectorAll('solid-ui-combobox-option')
check(`combobox lists ${issuers.length} suggested issuers`, issuers.length >= 2)
check(`default issuer filled in: ${combobox.value}`, !!combobox.value)

// Cancel closes the modal through the dialog events
click([...modal.shadowRoot.querySelectorAll('solid-ui-dialog-footer solid-ui-button')][0].shadowRoot.querySelector('button'))
check('Cancel closes the modal', !!await until(() => !root.shadowRoot.querySelector('solid-ui-login-modal')))

// Submit → auth.login(issuer). Stub only the issuer call so the page doesn't leave.
let loginTo = null
const realLogin = provider.auth.login.bind(provider.auth)
provider.auth.login = async (url) => url ? (loginTo = url) : realLogin()
click(account.shadowRoot.querySelector('solid-ui-login-button solid-ui-button'))
const modal2 = await until(() => root.shadowRoot.querySelector('solid-ui-login-modal'))
await until(() => modal2.shadowRoot.querySelector('solid-ui-dialog-footer'))
const combobox2 = modal2.shadowRoot.querySelector('solid-ui-combobox')
// Pick Solid Community from the listbox
const input2 = combobox2.shadowRoot.querySelector('input')
input2.focus()
await until(() => combobox2.open)
check('focusing the input opens the listbox', combobox2.open)
const options2 = [...combobox2.shadowRoot.querySelectorAll('[role="option"]')]
const solidcommunity2 = options2.find(o => o.textContent.includes('Solid Community'))
solidcommunity2.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, composed: true }))
await tick()
check('choosing an option sets the issuer', modal2.issuerInputValue === 'https://solidcommunity.net')

const submit = [...modal2.shadowRoot.querySelectorAll('solid-ui-dialog-footer solid-ui-button')][1]
click(submit.shadowRoot.querySelector('button'))
await until(() => loginTo)
check(`Login submits the issuer: ${loginTo}`, loginTo === 'https://solidcommunity.net')

out.textContent += 'DONE\n'
