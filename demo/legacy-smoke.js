// Load with legacy.html?smoke. Calls the legacy entry points the panes use and
// writes PASS/FAIL lines into <pre id="smoke">. Renders into #stage so you can look.

import { solidLogicSingleton } from 'solid-logic'
import * as widgets from '../src/widgets/index.js'
import * as utils from '../src/utils/index.js'
import * as login from '../src/login/login.js'
import { tabWidget } from '../src/lib/tabs.js'
import { style } from '../src/lib/style.js'
import { icons } from '../src/lib/iconBase.js'
import { CodeEditor } from '../src/lib/code-editor/index.js'
import ns from '../src/lib/ns.js'
import * as UI from '../src/solid-ui.js'
import { parse } from 'rdflib'
import { generatePrivateKey, generatePublicKey } from '../src/chat/keys.js'
import { getBlankMsg, signMsg, verifySignature } from '../src/chat/signature.js'

const out = document.getElementById('smoke')
const stage = document.getElementById('stage')
const store = solidLogicSingleton.store
const tick = (ms = 50) => new Promise(resolve => setTimeout(resolve, ms))
const check = (name, ok) => { out.textContent += `${ok ? 'PASS' : 'FAIL'} ${name}\n` }
const section = (title) => {
  const div = stage.appendChild(document.createElement('section'))

  div.appendChild(document.createElement('h2')).textContent = title

  return div
}
const attempt = async (name, fn) => {
  try {
    await fn()
  } catch (error) {
    check(`${name}: threw ${error.message}`, false)
    console.error(error)
  }
}

await attempt('buttons', async () => {
  const s = section('widgets.button, cancelButton, errorMessageBlock')
  const b = widgets.button(document, icons.iconBase + 'noun_925021.svg', 'Delete it')
  const c = widgets.cancelButton(document)

  s.append(b, c, widgets.errorMessageBlock(document, 'Something failed (a test error)'))
  check('widgets.button renders an icon button', b.tagName === 'BUTTON' && b.querySelector('img')?.src.endsWith('noun_925021.svg'))
  check('widgets.cancelButton renders', c.tagName === 'BUTTON')
})

await attempt('utils', async () => {
  check(`utils.label(foaf:nick) = "${utils.label(ns.foaf('nick'))}"`, utils.label(ns.foaf('nick')) === 'nick')
  check('utils.escapeForXML', utils.escapeForXML('<a&b>') === '&lt;a&amp;b>')
  check('lib/style has form styles', typeof style.formHeadingStyle === 'string' && style.formHeadingStyle.length > 0)
})

await attempt('legacy form', async () => {
  const s = section('widgets.appendForm (legacy forms renderer) over demo/form.ttl + demo/alice.ttl')
  const formDoc = new URL('form.ttl', import.meta.url).href
  const dataDoc = new URL('alice.ttl', import.meta.url).href

  await store.fetcher.load([formDoc, dataDoc])

  const container = s.appendChild(document.createElement('div'))

  widgets.appendForm(document, container, {}, store.sym(dataDoc + '#me'), store.sym(formDoc + '#form'), store.sym(dataDoc), () => {})
  await tick(300)

  const values = [...container.querySelectorAll('input, textarea')].map(i => i.value).filter(Boolean)

  check(`appendForm renders fields with values: ${values.join(' | ')}`, values.includes('Alice Example') && values.includes('alice'))
})

await attempt('tabs', async () => {
  const s = section('tabWidget')
  const items = ['https://example.org/one', 'https://example.org/two'].map(u => store.sym(u))
  const tabs = tabWidget({
    dom: document,
    subject: store.sym('https://example.org/'),
    items,
    renderMain: (body, subject) => { body.textContent = `body of ${subject.uri}` },
  })

  s.append(tabs)
  await tick(100)

  const buttons = tabs.querySelectorAll('nav li')

  check(`tabWidget renders ${buttons.length} tabs`, buttons.length === 2)
  buttons[1]?.querySelector('a, button, div')?.click()
  await tick(100)
  check('clicking a tab renders its body', tabs.textContent.includes('body of https://example.org/two'))
})

await attempt('code editor', async () => {
  const s = section('CodeEditor (CodeMirror 6 via the importmap)')
  const container = s.appendChild(document.createElement('div'))
  const editor = new CodeEditor()

  await editor.initialize(container, '@prefix foaf: <http://xmlns.com/foaf/0.1/> .\n<#me> foaf:nick "alice" .\n', 'text/turtle', 'light')
  check('CodeEditor mounts with one @codemirror/state', !!container.querySelector('.cm-editor') && container.textContent.includes('foaf:nick'))
})

await attempt('login', async () => {
  const s = section('login.loginStatusBox')
  const box = login.loginStatusBox(document, () => {})

  s.append(box)
  await tick(300)
  check('loginStatusBox renders', box instanceof HTMLElement && box.textContent.length >= 0)
})


await attempt('acl', async () => {
  const doc = 'https://pod.example/folder/'
  const aclDoc = doc + '.acl'

  parse(`@prefix acl: <http://www.w3.org/ns/auth/acl#> .
<#owner> a acl:Authorization ; acl:accessTo <./> ; acl:default <./> ;
  acl:agent <https://alice.example/profile/card#me> ; acl:mode acl:Read, acl:Write, acl:Control .
<#public> a acl:Authorization ; acl:accessTo <./> ;
  acl:agentClass <http://xmlns.com/foaf/0.1/Agent> ; acl:mode acl:Read .`, store, aclDoc, 'text/turtle')

  const ac = UI.acl.readACL(store.sym(doc), store.sym(aclDoc), store)
  const summary = UI.acl.ACLToString(ac)

  check(`acl.readACL + ACLToString: ${summary.trim().replace(/\n/g, ' / ')}`, summary === '{CRW:@alice.example;R:*}')
})

await attempt('chat signature', async () => {
  const key = generatePrivateKey()
  const pub = generatePublicKey(key)
  const msg = { ...getBlankMsg(), id: 'https://pod.example/chat#m1', created: '2026-10-21T12:00:00Z', content: 'hello', maker: 'https://alice.example/profile/card#me' }
  const sig = signMsg(msg, key)

  check('chat signMsg → verifySignature (noble schnorr)', verifySignature(sig, msg, pub) === true)
  check('chat verifySignature rejects a changed message', verifySignature(sig, { ...msg, content: 'hullo' }, pub) === false)
})

await attempt('header + footer', async () => {
  const s = section('initHeader / initFooter')
  const header = s.appendChild(document.createElement('div'))
  const footer = s.appendChild(document.createElement('div'))

  header.id = 'PageHeader'
  footer.id = 'PageFooter'
  await UI.initHeader(store, [], {})
  await UI.initFooter(store, {})
  await tick(300)
  check('initHeader renders a header', header.children.length > 0)
  check('initFooter renders a footer', footer.children.length > 0 && footer.textContent.trim().length > 0)
})

await attempt('media', async () => {
  const s = section('media.cameraButton')
  const b = UI.media.cameraButton(document, store, () => store.sym('https://pod.example/photo.png'), () => {})

  s.append(b)
  check('media.cameraButton renders', b instanceof HTMLElement && !!b.querySelector('button, img'))
})

out.textContent += 'DONE\n'
