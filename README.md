# solid-ui, no build

All of [SolidOS/solid-ui](https://github.com/SolidOS/solid-ui) (v5.0.1 `main`) — the 27 web components and the legacy library the panes use — as plain ES modules. Edit a file, reload. No Vite, no TypeScript compiler, no plugins.

```sh
python3 -m http.server 8731   # any static server
```

- `index.html` — gallery of every component (mock auth). `?smoke` runs 23 click-through checks, `?tags` checks all 27 tags register.
- `login.html` — real Solid login through `solid-ui-provider` → SolidAuth → solid-logic. `?smoke` runs 10 checks.
- `mashlib/databrowser.html` — **SolidOS itself**: mashlib's shell, solid-panes and every registered pane. On a pod, the page's own URL is the subject, as upstream; locally, `?uri=` picks one (e.g. a WebID, a folder, a Turtle file).
- `pane.html?pane=profile-pane` — a pane sandbox (same context and flow as solidos-toolkit's): loads `panes/<pane>/src/index.js` and renders it for `?subject=`. `&smoke` runs the pane's checks (`demo/<name>-smoke.js`).
- `demo/load-each.html?dir=…` — imports every module under a directory on its own and names the ones that fail (needs a server with directory listings, like `python3 -m http.server`).
- `legacy.html` — the legacy library. Runs 16 behaviour checks (buttons, the legacy form renderer, tabs, CodeEditor, loginStatusBox, ACLs, chat signatures, header/footer, camera button); `?load` imports all 85 modules and checks `src/solid-ui.js` exports the same 45 names as upstream's published `dist/index.esm.js`.

## Tests

```sh
python3 -m http.server 8731 &           # in this directory
node tests/run-all.mjs                  # every page check, module loads, the shell on the public test pod
node tests/run-all.mjs --pod            # … plus login, editing and creating on a local JSS pod (below)
```

`tools/cdp.mjs` drives headless Chromium over the DevTools protocol (no npm dependencies); `tests/shell.mjs` and `tests/pod.mjs` use it. Failures with a confirmed external cause print as `KNOWN` with the reason (see "Upstream findings").

## Using it

```html
<script src="src/importmap.js"></script>
<link rel="stylesheet" href="src/styles/theme.css">
<script type="module" src="src/index.js"></script>

<solid-ui-provider>
  <solid-ui-account></solid-ui-account>
</solid-ui-provider>
```

The legacy API, as panes use it (`src/importmap.js` maps `solid-ui` and `solid-ui/components/*` to these files, as upstream's package.json `exports` does):

```js
import * as UI from 'solid-ui'                      // UI.widgets, UI.login, UI.acl, UI.tabs, UI.initHeader, …
import { Combobox } from 'solid-ui/components/combobox'
```

## How the build steps were replaced

| Upstream (build) | Here (no build) |
|---|---|
| TypeScript | JS + JSDoc types |
| `@customElement`, `@property`, `@state` | `define()`, `static properties`, defaults in the constructor |
| `@consume` / `@provide` | `consume()` / `provide()` in `src/lib/context.js` |
| `@query('x')` | getter over `renderRoot.querySelector('x')` |
| `import styles from './X.styles.css'` | `await loadSheet(new URL('./X.styles.css', import.meta.url))` |
| `~icons/<set>/<name>` (unplugin-icons) | `src/lib/icons.js`, same `icon-<set>-<name>` tags |
| npm dependencies | `src/importmap.js` → jsdelivr |

Component CSS files are byte-for-byte upstream, except `src/lib/WebComponent.styles.css`, which is upstream's *built* output: their build resets margin/padding on a list of HTML elements instead of `*`, and the raw Tailwind preflight breaks nested components.

## Deviations from upstream

- Atkinson Hyperlegible Next is self-hosted (`src/fonts/`, SIL OFL) instead of loaded from Google Fonts, so pages make no requests to Google.

- `src/index.js` attaches a `ContextRoot`, so a consumer that connects before its provider still gets the context. Upstream relies on registration order, which top-level-await stylesheets can't guarantee.
- `rdf-form`: parts are looked up in the form *document*, so a `formUrl` with a fragment works. Upstream uses the full URL as the graph and renders an empty form (upstream bug).
- `SolidAuth.login()` loads the login modal lazily.
- `fieldParams` keeps only the keys the web components read; the `style`/`size`/`pattern` entries serve the legacy widgets.
- The three login/logout/signup buttons are one factory (`components/auth-buttons.js`); the three dialog wrappers are one file (`components/dialog-parts.js`).

## Legacy code

`widgets/`, `utils/`, `lib/`, `login/`, `signup/`, `acl/`, `chat/`, `create/`, `header/`, `footer/`, `matrix/`, `media/`, `v2/`, `icons/`: 84 files, ~20,000 lines, imported once with `tools/convert.mjs` and edited by hand from then on:

```sh
node tools/convert.mjs tools/solid-ui.json
```

- `.ts` files go through Node's own `stripTypeScriptTypes` (strip mode, which blanks types in place); the gaps it leaves are closed, and a check against the untidied output confirms the token stream is identical and no line break that matters to ASI moved. Strip mode refuses three constructs that emit code, so they are first rewritten into plain TypeScript: parameter properties (`constructor (private x)` → `this.x = x`), explicit-value enums (`LogLevel` → frozen object) and `<T>expr` casts (dropped: no runtime effect). No file needs transform mode, which would reformat it.
- Imports become explicit relative `.js` URLs.
- Upstream imports some types without `import type` (tsc elides them; stripping can't). The second pass drops names the target module doesn't export at runtime: 23 in all, listed when it runs.
- Skipped, because they are already hand-converted above: `lib/components`, `lib/auth`, `lib/dialogs`, `lib/forms`, `lib/ns`, `lib/timing`, `lib/values`.

CodeMirror and Lezer load from esm.sh with every dependency external (`*` prefix) and are pinned once in `src/importmap.js` at upstream's lockfile versions, so there is exactly one `@codemirror/state`. jsdelivr's `+esm` builds pin six different ones, which breaks the editor.

`src/solid-ui.js` is upstream's `src/index.ts` (the package entry), written by hand: its `lib/auth`, `lib/components` and `lib/dialogs` re-exports point at the hand-converted modules. `customElement` is a plain function there: `customElement(tag)(Class)`. Each `src/components/<name>/index.js` mirrors upstream's `index.ts` for that component.

Not carried over: `storybook/` (replaced by the demo pages), `types/` (declarations only), `cdn/` (two re-export stubs), and generated `versionInfo.ts`.

## Panes

`panes/<name>/` holds a pane converted with the same tool and a config of its own:

```sh
node tools/convert.mjs tools/profile-pane.json        # → panes/profile-pane/
python3 tools/check-bare-imports.py panes/profile-pane/src   # type-only names imported from packages → config "bareTypes"
```

Beyond what solid-ui needed, panes use Vite's asset imports, which the converter maps to the platform:

| Vite | No build |
|---|---|
| `import './x.css'` (injected into `<head>`) | `importCss(new URL('./x.css', import.meta.url))` → a `<link>` |
| `import form from './x.ttl'` (raw plugin) | `const form = await (await fetch(new URL('./x.ttl', import.meta.url))).text()` |
| `import icon from '../icons-png/x.png'` | `const icon = new URL('../icons-png/x.png', import.meta.url).href` |

More that the shell needed:

| Build feature | No build |
|---|---|
| Lit decorators: `@property`/`@state() accessor x = v` | `static properties` + `this.x = v` in the constructor (class fields would shadow Lit's accessors) |
| `@consume` / `@provide` | `ContextConsumer` / `ContextProvider` + a get/set that calls `setValue`, as Lit's decorators do |
| `@query('sel')`, `@customElement('tag')` | a `renderRoot.querySelector` getter; `customElements.define` after the class |
| `import styles from './x.styles.css'` (lit-css) | `await loadSheet(new URL(…))`, a `CSSStyleSheet` |
| `import '~icons/lucide/x'` (unplugin-icons) | the package's `icons.js`, SVGs fetched once from Iconify, same `icon-lucide-x` elements |
| `@media (--solid-ui-mobile)` (`@custom-media`) | the query substituted, as their CSS build does |
| `@import "solid-ui/theme.css"` in CSS | a relative URL (no importmap applies to CSS) |
| tsconfig `baseUrl` imports (`src/…`), generated `versionInfo.ts` | config `aliases`, `generated` |

`bareModules` in a config points `solid-ui` and `solid-ui/components/*` at the local files, so type-only names imported from them are caught too.

- **solid-panes** (v5.0.0, 72 files, ~17,600 lines): the outline, header, navbar, file-explorer header and the panes it defines itself. Its 9 Lit components use decorators; the converter rewrites them (below). `argument/argumentPane.js` fails to load on its own (CommonJS `module.__dirname`), as upstream: it is commented out in `registerPanes.js` and not in their bundle either.
- **mashlib** (v3.0.0, 4 files): the shell. One recorded patch: `window.panes` is a copy of the solid-panes namespace, because a real module namespace is sealed (webpack's isn't) and `runDataBrowser` is added to it.
- **profile-pane** (v4.0.0, 94 files, ~15,000 lines): renders the real test profile (`testingsolidos.solidcommunity.net`) in both layouts; `pane.html?pane=profile-pane&smoke` runs 7 checks. 175 type-only names dropped, all files in strip mode. Panes rely on the host page for `.sr-only` (mashlib's `mash-utilities.css`); the sandbox provides it.

- **folder-pane, source-pane, chat-pane, contacts-pane** (v4.0.0, Vite + TypeScript) and **issue-pane, meeting-pane** (v4.0.0, webpack + babel): converted with the same tool (`tools/<pane>.json`). The webpack ones import Turtle through `babel-plugin-inline-import` (`import { formText } from './form.ttl'`) and `require('./x.ttl')` inline; both become fetched text.

### Published builds, for A/B

Only **activitystreams-pane** (React) still loads as a published build: `src/importmap.js` maps it to esm.sh with every dependency external (`*` prefix), so `solid-ui`, `rdflib`, `lit`, … resolve to the single copies mapped here, and React 19 is mapped once. `pane-registry` is CommonJS that builds its exports at runtime, so `src/vendor/pane-registry.js` re-exports its named members.

`?published=issue-pane,contacts-pane` on any page swaps those panes back to their published npm builds. That is how each upstream finding below was checked: same behaviour with upstream's own build means it is not the conversion.

## Running on a pod

[JSS](https://jss.live) serves an ES-module data browser with `--mashlib-module <url>`: for every resource a browser navigates to it returns a bare page that loads that module. `mashlib/boot.js` is that module; it adds the importmap and the `databrowser.html` markup and starts mashlib. Put this tree in the pod and SolidOS is served by the pod it browses:

```sh
jss start --port 8732 --host 127.0.0.1 --root ./jss-data --idp --conneg \
  --single-user --single-user-name me --single-user-password "$PW" \
  --mashlib-module http://127.0.0.1:8732/me/public/solidos/mashlib/boot.js
ln -s "$PWD/nobuild" jss-data/me/public/solidos     # JSS follows symlinked folders: edit, reload
```

- `--single-user-name me` puts the pod at `/me/`. At the server root, JSS's landing `index.html` is the folder's representation, so `/` can't be browsed as a folder.
- Use `127.0.0.1`, not `localhost`: the IdP's issuer is the address JSS binds to.
- `tests/pod.mjs` logs in through the IdP (skipping the passkey offer, allowing consent), edits the profile bio and checks `card.jsonld` on disk, mints a tracker, address book, notepad, meeting, long chat, chat and schedule and opens each, and sends a chat message and checks it is written.

## Upstream findings

Found while converting and testing; each reproduced with upstream's own code or build.

| Where | What | Status |
|---|---|---|
| solid-ui 5.0.1 `rdf-form` | With a `formUrl` that has a `#fragment` (which `findForm` supports), parts are looked up in a graph named by the full URL, so the form renders empty | Fixed here; patch ready (`../solid-ui-rdf-form-fragment.patch`) |
| issue-pane 4.0.0 | A tracker it has just minted shows "Tracker settings need an update": `fixSubClasses` looks for `wf:Task`'s `owl:disjointUnionOf` in the tracker's document, but it is only in the workflow ontology | Same with the published build |
| JSS 0.0.212 + SolidOS | JSS accepts ACL documents only as JSON-LD (415 for Turtle); SolidOS writes ACLs as Turtle (long chat, address book, schedule, the sharing editor) | Server-side; address book and schedule creation stop there |
| profile-pane 4.0.0 | `SocialData: SocialPresentation` is literal text inside the social card's markup (a type annotation pasted into a template) | Harmless |
| pane-registry 5.0.1 | Published as CommonJS that assigns its exports at runtime, so ESM consumers (and CDNs) can't get named exports | Shimmed here |
| solid-ui 5.0.1 (built CSS) | The Tailwind reset in every component's `:host` sets `font-family: ui-sans-serif, …`, overriding the theme's Atkinson Hyperlegible for everything inside a component, panes included (they render in solid-panes' file-explorer component) | Same with upstream's build; reproduced faithfully |
| solid-panes 5.0.0 | `argument/argumentPane.js` uses `module.__dirname`; dead code (commented out in `registerPanes.js`) | Left as is |

