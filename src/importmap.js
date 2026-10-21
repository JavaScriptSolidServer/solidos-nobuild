// Classic script: <script src="src/importmap.js"></script>, before any module.
// One place for the bare-specifier → URL mapping instead of a copy per page.
// `rdflib` and `solid-namespace` are the exact URLs solid-logic@6.0.0 imports,
// so there is one rdflib instance across solid-logic and solid-ui.

const script = document.createElement('script')
const here = (path) => new URL(path, document.currentScript.src).href
const components = ['account', 'avatar', 'button', 'combobox', 'combobox-option', 'dialog', 'dialog-content',
  'dialog-footer', 'dialog-header', 'dialog-provider', 'dialogs-root', 'guard', 'input', 'login-button',
  'login-modal', 'logout-button', 'menu', 'menu-item', 'photo-capture', 'photo-capture-modal', 'provider',
  'rdf-form', 'rdf-input', 'select', 'select-option', 'signup-button', 'solid-emblem']

// A/B against upstream: ?published=issue-pane,contacts-pane (or, where the URL is
// the resource itself, as on a pod: localStorage.published = 'issue-pane') maps
// those packages to their published npm builds (esm.sh, dependencies external)
// instead of the converted source here.
const PUBLISHED = {
  'solid-panes': '5.0.0',
  'profile-pane': '4.0.0', 'folder-pane': '4.0.0', 'source-pane': '4.0.0', 'chat-pane': '4.0.0',
  'contacts-pane': '4.0.0', 'issue-pane': '4.0.0', 'meeting-pane': '4.0.0', 'activitystreams-pane': '2.0.0',
}
const storedPublished = (() => { try { return localStorage.getItem('published') } catch { return null } })()
const published = (new URL(location.href).searchParams.get('published') ?? storedPublished ?? '').split(',').filter(p => PUBLISHED[p])

if (published.length) console.info(`importmap: published builds for ${published.join(', ')}`)

script.type = 'importmap'
script.textContent = JSON.stringify({
  imports: {
    // solid-ui itself, as panes import it (package.json "exports" upstream)
    'solid-ui': here('./solid-ui.js'),
    'solid-ui/components': here('./index.js'),
    ...Object.fromEntries(components.map(c => [`solid-ui/components/${c}`, here(`./components/${c}/index.js`)])),

    // Panes converted here, by package name
    'solid-panes': here('../panes/solid-panes/src/index.js'),
    'profile-pane': here('../panes/profile-pane/src/index.js'),

    'folder-pane': here('../panes/folder-pane/src/index.js'),
    'source-pane': here('../panes/source-pane/src/index.js'),
    'chat-pane': here('../panes/chat-pane/src/index.js'),
    'contacts-pane': here('../panes/contacts-pane/src/index.js'),
    'issue-pane': here('../panes/issue-pane/src/issuePane.js'),
    'meeting-pane': here('../panes/meeting-pane/src/meetingPane.js'),

    // Not converted: activitystreams-pane (React). Its published build via esm.sh
    // with every dependency external (* prefix), so solid-ui, rdflib, … resolve
    // to the single copies mapped here.
    'activitystreams-pane': 'https://esm.sh/*activitystreams-pane@2.0.0',
    ...Object.fromEntries(published.map(p => [p, `https://esm.sh/*${p}@${PUBLISHED[p]}`])),
    // Global names the webpack UMD builds of the panes required (require("SolidLogic"),
    // require("UI")); kept for any published build that still uses them.
    SolidLogic: 'https://cdn.jsdelivr.net/npm/solid-logic@6.0.0/+esm',
    $rdf: 'https://cdn.jsdelivr.net/npm/rdflib@2.4.1/+esm', // mashlib's webpack aliases this too
    UI: here('./solid-ui.js'),

    // solid-panes' own dependencies, and activitystreams-pane's React (one instance)
    marked: 'https://esm.sh/marked@18.0.14',
    dompurify: 'https://esm.sh/dompurify@3.4.16',
    '@solid/better-simple-slideshow': 'https://esm.sh/@solid/better-simple-slideshow@0.1.0',
    react: 'https://esm.sh/react@19.3.0',
    'react-dom/client': 'https://esm.sh/react-dom@19.3.0/client?external=react',
    'react-jss': 'https://esm.sh/react-jss@10.10.0?external=react',
    'timeago.js': 'https://esm.sh/timeago.js@4.0.2',

    lit: 'https://cdn.jsdelivr.net/npm/lit@3.3.1/+esm',
    'lit/decorators.js': 'https://cdn.jsdelivr.net/npm/lit@3.3.1/decorators.js/+esm', // a published pane build still uses them
    '@lit/context': 'https://cdn.jsdelivr.net/npm/@lit/context@1.1.6/+esm',
    '@lit/task': 'https://cdn.jsdelivr.net/npm/@lit/task@1.0.3/+esm',
    'solid-logic': 'https://cdn.jsdelivr.net/npm/solid-logic@6.0.0/+esm',
    rdflib: 'https://cdn.jsdelivr.net/npm/rdflib@2.4.1/+esm',
    'solid-namespace': 'https://cdn.jsdelivr.net/npm/solid-namespace@0.5.4/+esm',
    'webawesome/': 'https://cdn.jsdelivr.net/npm/@awesome.me/webawesome@3.9.0/dist-cdn/',
    'pane-registry': here('./vendor/pane-registry.js'), // named exports over the CommonJS build
    uuid: 'https://cdn.jsdelivr.net/npm/uuid@14.0.2/+esm',
    // the lit-html lit@3.3.1's bundle imports, so panes and solid-ui share one instance
    'lit-html': 'https://cdn.jsdelivr.net/npm/lit-html@3.3.0/+esm',
    qrcode: 'https://esm.sh/qrcode@1.5.4',
    '@noble/curves/': 'https://cdn.jsdelivr.net/npm/@noble/curves@2.4.0/',
    '@noble/hashes/': 'https://cdn.jsdelivr.net/npm/@noble/hashes@2.4.0/',
    'escape-html': 'https://esm.sh/escape-html@1.0.3',
    'mime-types': 'https://esm.sh/mime-types@3.0.2',
    // CodeMirror + Lezer: esm.sh with every dependency external (the * prefix),
    // pinned once here at upstream's lockfile versions, so there is exactly one
    // @codemirror/state. (jsdelivr's +esm builds pin six different ones.)
    '@codemirror/autocomplete': 'https://esm.sh/*@codemirror/autocomplete@6.20.3',
    '@codemirror/autocomplete/': 'https://esm.sh/*@codemirror/autocomplete@6.20.3/',
    '@codemirror/commands': 'https://esm.sh/*@codemirror/commands@6.11.1',
    '@codemirror/commands/': 'https://esm.sh/*@codemirror/commands@6.11.1/',
    '@codemirror/lang-css': 'https://esm.sh/*@codemirror/lang-css@6.3.1',
    '@codemirror/lang-css/': 'https://esm.sh/*@codemirror/lang-css@6.3.1/',
    '@codemirror/lang-html': 'https://esm.sh/*@codemirror/lang-html@6.4.12',
    '@codemirror/lang-html/': 'https://esm.sh/*@codemirror/lang-html@6.4.12/',
    '@codemirror/lang-javascript': 'https://esm.sh/*@codemirror/lang-javascript@6.2.5',
    '@codemirror/lang-javascript/': 'https://esm.sh/*@codemirror/lang-javascript@6.2.5/',
    '@codemirror/lang-json': 'https://esm.sh/*@codemirror/lang-json@6.0.2',
    '@codemirror/lang-json/': 'https://esm.sh/*@codemirror/lang-json@6.0.2/',
    '@codemirror/lang-markdown': 'https://esm.sh/*@codemirror/lang-markdown@6.5.2',
    '@codemirror/lang-markdown/': 'https://esm.sh/*@codemirror/lang-markdown@6.5.2/',
    '@codemirror/lang-xml': 'https://esm.sh/*@codemirror/lang-xml@6.1.0',
    '@codemirror/lang-xml/': 'https://esm.sh/*@codemirror/lang-xml@6.1.0/',
    '@codemirror/language': 'https://esm.sh/*@codemirror/language@6.12.4',
    '@codemirror/language/': 'https://esm.sh/*@codemirror/language@6.12.4/',
    '@codemirror/legacy-modes': 'https://esm.sh/*@codemirror/legacy-modes@6.5.4',
    '@codemirror/legacy-modes/': 'https://esm.sh/*@codemirror/legacy-modes@6.5.4/',
    '@codemirror/state': 'https://esm.sh/*@codemirror/state@6.7.6',
    '@codemirror/state/': 'https://esm.sh/*@codemirror/state@6.7.6/',
    '@codemirror/view': 'https://esm.sh/*@codemirror/view@6.43.13',
    '@codemirror/view/': 'https://esm.sh/*@codemirror/view@6.43.13/',
    '@lezer/common': 'https://esm.sh/*@lezer/common@1.5.3',
    '@lezer/common/': 'https://esm.sh/*@lezer/common@1.5.3/',
    '@lezer/css': 'https://esm.sh/*@lezer/css@1.3.8',
    '@lezer/css/': 'https://esm.sh/*@lezer/css@1.3.8/',
    '@lezer/highlight': 'https://esm.sh/*@lezer/highlight@1.2.5',
    '@lezer/highlight/': 'https://esm.sh/*@lezer/highlight@1.2.5/',
    '@lezer/html': 'https://esm.sh/*@lezer/html@1.3.13',
    '@lezer/html/': 'https://esm.sh/*@lezer/html@1.3.13/',
    '@lezer/javascript': 'https://esm.sh/*@lezer/javascript@1.5.5',
    '@lezer/javascript/': 'https://esm.sh/*@lezer/javascript@1.5.5/',
    '@lezer/json': 'https://esm.sh/*@lezer/json@1.0.3',
    '@lezer/json/': 'https://esm.sh/*@lezer/json@1.0.3/',
    '@lezer/lr': 'https://esm.sh/*@lezer/lr@1.4.10',
    '@lezer/lr/': 'https://esm.sh/*@lezer/lr@1.4.10/',
    '@lezer/markdown': 'https://esm.sh/*@lezer/markdown@1.7.2',
    '@lezer/markdown/': 'https://esm.sh/*@lezer/markdown@1.7.2/',
    '@lezer/xml': 'https://esm.sh/*@lezer/xml@1.0.6',
    '@lezer/xml/': 'https://esm.sh/*@lezer/xml@1.0.6/',
    '@marijn/find-cluster-break': 'https://esm.sh/*@marijn/find-cluster-break@1.0.4',
    '@marijn/find-cluster-break/': 'https://esm.sh/*@marijn/find-cluster-break@1.0.4/',
    '@uiw/codemirror-theme-vscode': 'https://esm.sh/*@uiw/codemirror-theme-vscode@4.25.12',
    '@uiw/codemirror-theme-vscode/': 'https://esm.sh/*@uiw/codemirror-theme-vscode@4.25.12/',
    '@uiw/codemirror-themes': 'https://esm.sh/*@uiw/codemirror-themes@4.25.12',
    '@uiw/codemirror-themes/': 'https://esm.sh/*@uiw/codemirror-themes@4.25.12/',
    'crelt': 'https://esm.sh/*crelt@1.0.7',
    'crelt/': 'https://esm.sh/*crelt@1.0.7/',
    'style-mod': 'https://esm.sh/*style-mod@4.1.4',
    'style-mod/': 'https://esm.sh/*style-mod@4.1.4/',
    'w3c-keyname': 'https://esm.sh/*w3c-keyname@2.2.8',
    'w3c-keyname/': 'https://esm.sh/*w3c-keyname@2.2.8/',
  },
})

document.currentScript.after(script)
