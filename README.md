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

### Panes still loaded as published builds

solid-panes registers seven more panes: chat, contacts, folder, source, issue, meeting and activitystreams. Until each is converted like profile-pane, `src/importmap.js` loads its published build from esm.sh with every dependency external (`*` prefix), so `solid-ui`, `rdflib`, `lit`, … resolve to the single copies mapped here. That covers the webpack CommonJS builds too (issue-pane, meeting-pane), which `require("SolidLogic")`/`require("UI")` by global name, mapped as such. activitystreams-pane brings React 19, also mapped once. `pane-registry` is CommonJS that builds its exports at runtime, so `src/vendor/pane-registry.js` re-exports its named members over the CDN build.
