# Notices

Everything under `src/`, `panes/` and `mashlib/` is converted from the SolidOS
packages below (`tools/convert.mjs`, `tools/<package>.json`), MIT-licensed by
their authors. The converted files keep upstream's comments and structure; the
deviations are listed in README.md.

| Package | Version | Commit | Date | Licence | Converted to |
|---|---|---|---|---|---|
| [solid-ui](https://github.com/SolidOS/solid-ui) | 5.0.1 | d7b8c4c | 2026-09-30 | MIT, Copyright (c) 2019 Solid | `src/` |
| [mashlib](https://github.com/SolidOS/mashlib) | 3.0.0 | 309a1e9 | 2026-09-29 | MIT, Copyright (c) 2016 - present Tim Berners-Lee and contributors | `mashlib/` |
| [solid-panes](https://github.com/SolidOS/solid-panes) | 5.0.0 | 504265f | 2026-09-29 | MIT, Copyright (c) 2016 - present | `panes/solid-panes/` |
| [profile-pane](https://github.com/SolidOS/profile-pane) | 4.0.0 | a16bfb4 | 2026-09-29 | MIT (package.json; the repo ships no LICENSE file) | `panes/profile-pane/` |
| [folder-pane](https://github.com/SolidOS/folder-pane) | 4.0.0 | 28e11cf | 2026-09-29 | MIT | `panes/folder-pane/` |
| [source-pane](https://github.com/SolidOS/source-pane) | 4.0.0 | 136a71c | 2026-09-29 | MIT | `panes/source-pane/` |
| [chat-pane](https://github.com/SolidOS/chat-pane) | 4.0.0 | 8f66888 | 2026-09-29 | MIT | `panes/chat-pane/` |
| [contacts-pane](https://github.com/SolidOS/contacts-pane) | 4.0.0 | 955964b | 2026-09-29 | MIT | `panes/contacts-pane/` |
| [issue-pane](https://github.com/SolidOS/issue-pane) | 4.0.0 | 204e40f | 2026-09-29 | MIT | `panes/issue-pane/` |
| [meeting-pane](https://github.com/SolidOS/meeting-pane) | 4.0.0 | b176f24 | 2026-09-29 | MIT, Copyright 2019 - present | `panes/meeting-pane/` |

To reconvert, clone each upstream repository beside this one as `../upstream-<package>`
and run `node tools/convert.mjs tools/<package>.json`.

## Other material in this repository

- `src/lib/WebComponent.styles.css` contains Tailwind CSS v4.3.3's preflight as built by solid-ui (MIT, Tailwind Labs).
- Icons in `src/lib/icons.js` and `panes/*/src/icons.js`: [Lucide](https://lucide.dev) (ISC) and [SVG Spinners](https://github.com/n3r4zzurr0/svg-spinners) (MIT), fetched from Iconify; the Solid emblem from solid-ui.
- `src/fonts/`: Atkinson Hyperlegible Next, SIL Open Font License 1.1 (`src/fonts/OFL.txt`).
- `panes/profile-pane/icons-png/`: social-network logos shipped by profile-pane.

## Loaded at runtime, not in this repository

`src/importmap.js` loads Lit (BSD-3-Clause), rdflib and solid-logic (MIT), Web Awesome
(MIT), CodeMirror and Lezer (MIT), React (MIT) and the remaining npm dependencies from
jsdelivr and esm.sh at the versions SolidOS pins. The legacy widgets load their icons
from `https://solidos.github.io/solid-ui/src/icons/` (solid-ui's `iconBase`).
