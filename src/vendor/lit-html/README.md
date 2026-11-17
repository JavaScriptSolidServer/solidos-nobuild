# lit-html directives, vendored

`directive.js`, `directive-helpers.js`, `async-directive.js` and `directives/{repeat,ref,keyed}.js`
from the npm package `lit-html@3.3.0` (Google LLC, BSD-3-Clause), as published, with one change:
`./lit-html.js` and `../lit-html.js` are imported as `lit-html`, which `src/importmap.js` maps to
the one lit-html build that `lit` itself imports.

Why: jsdelivr's `+esm` build of each directive bundles a private copy of lit-html, so its
`nothing`, `noChange` and part classes are not the ones the renderer uses. `src/importmap.js`
maps `lit/directives/*.js` to these files.
