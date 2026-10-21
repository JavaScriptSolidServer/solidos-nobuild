#!/usr/bin/env node
// One-time import of upstream TypeScript into plain ES modules. Not a build
// step: the output is the source from then on, edited by hand like everything else.
//
//   node tools/convert.mjs tools/solid-ui.json
//   node tools/convert.mjs tools/profile-pane.json
//
// - .ts → .js with Node's stripTypeScriptTypes in strip mode (types blanked in
//   place, then the gaps closed), after rewriting the few constructs strip mode
//   refuses (parameter properties, explicit-value enums, <T> casts).
// - Import specifiers become explicit relative URLs with .js (`@/x` alias too).
//   Bare specifiers (rdflib, solid-ui, …) are left for src/importmap.js.
// - `import './x.css'` (Vite injects these into <head>) → importCss(); `import x
//   from './x.ttl'` (raw text) → fetch(); `import x from './x.png'` → its URL;
//   inline `require('./x.ttl')` (webpack raw loader) → a fetched constant.
//   CSS, TTL and imported image files are copied as they are.
// - Type-only names imported without `import type` are dropped (second pass).
//
// Config (paths relative to the config file):
//   from, to       upstream src/ and output directory
//   roots          directories (or ".") under `from` to convert
//   skip           regexes (as strings) of paths under `from` to leave out
//   bareModules    { "solid-ui": "../src/solid-ui.js", … } local files behind bare
//                  specifiers, so their runtime exports can be checked
//   bareTypes      { "pane-registry": ["DataBrowserContext", …] } type-only names
//                  of packages that can't be checked locally
//   aliases        { "src/": "." } path prefixes resolved against `from` ("@/" built in)
//   cssImports     { "solid-ui/theme.css": "../src/styles/theme.css" } package paths
//                  in CSS @import, rewritten to relative URLs
//   customMedia    { "file": "…/breakpoints.css", "import": "solid-ui/breakpoints.css" }
//                  @custom-media to substitute into @media rules
//   patches        [{ "file", "find", "replace", "why" }] deliberate edits to the output,
//                  applied last; conversion fails if one no longer applies
//   generated      { "versionInfo.js": "export default {…}" } files upstream's build
//                  writes; imports of them resolve as if they were sources

import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync, copyFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { stripTypeScriptTypes } from 'node:module'
import { execSync } from 'node:child_process'

const configFile = process.argv[2] && resolve(process.argv[2])

if (!configFile) {
  console.error('usage: convert.mjs <config.json>')
  process.exit(1)
}

const config = JSON.parse(readFileSync(configFile, 'utf8'))
const base = dirname(configFile)
const from = resolve(base, config.from)
const to = resolve(process.env.CONVERT_TO ?? resolve(base, config.to))
const ROOTS = config.roots ?? ['.']
const SKIP = [...(config.skip ?? []), '\\.(test|stories)\\.[jt]s$', '\\.d\\.ts$'].map(re => new RegExp(re))
const BARE_MODULES = Object.fromEntries(Object.entries(config.bareModules ?? {}).map(([k, v]) => [k, resolve(base, v)]))

const listed = execSync(`cd ${from} && find ${ROOTS.join(' ')} -type f \\( -name '*.ts' -o -name '*.js' -o -name '*.css' -o -name '*.ttl' \\)`)
  .toString().trim().split('\n')
  .map(f => f.replace(/^\.\//, ''))
  .filter(f => !SKIP.some(re => re.test(f)))
  .sort()
const files = listed.filter(f => /\.[jt]s$/.test(f))
const assets = listed.filter(f => !/\.[jt]s$/.test(f))

// Path aliases: "@/x" (Vite) and any from the config, e.g. { "src/": "." } for a
// tsconfig baseUrl of the project root. Values are relative to `from`.
const ALIASES = { '@/': '.', ...(config.aliases ?? {}) }
// Files upstream's build generates (e.g. versionInfo.ts), written as given into `to`.
const GENERATED = config.generated ?? {}
const aliasFor = spec => Object.keys(ALIASES).find(prefix => spec.startsWith(prefix))

function resolveTarget (spec, fileDir) {
  const alias = aliasFor(spec)
  const base = alias ? join(from, ALIASES[alias], spec.slice(alias.length)) : resolve(fileDir, spec)
  const candidates = [base, `${base}.ts`, `${base}.js`, join(base, 'index.ts'), join(base, 'index.js')]

  return candidates.find(c => existsSync(c) && statSync(c).isFile())
}

function rewriteSpecifier (spec, file) {
  if (!spec.startsWith('.') && !aliasFor(spec)) return spec // bare: importmap

  const fileDir = dirname(join(from, file))
  const target = resolveTarget(spec, fileDir)

  if (!target) {
    const virtual = relative(from, aliasFor(spec) ? join(from, ALIASES[aliasFor(spec)], spec.slice(aliasFor(spec).length)) : resolve(fileDir, spec))

    if (GENERATED[`${virtual}.js`] !== undefined) return spec.replace(/(\.[jt]s)?$/, '.js')

    console.warn(`  unresolved ${spec} in ${file}`)

    return spec
  }

  let rel = relative(fileDir, target).replace(/\.ts$/, '.js')

  if (!rel.startsWith('.')) rel = './' + rel

  return rel
}

// Strip mode blanks types with spaces so positions survive:
//   createContext<X>(…)  → createContext   (…)
//   (options: Options) { → (options         ) {
// Since the output is the source from now on, close those gaps. A blanked span
// is a run of whitespace in the stripped text that covers at least one
// non-whitespace character of the original.
function tidyBlanks (original, stripped) {
  if (original.length !== stripped.length) return stripped

  const isWs = c => c === ' ' || c === '\t' || c === '\n' || c === '\r'
  const isWord = c => c !== undefined && /[\w$]/.test(c)
  let out = ''
  let i = 0

  while (i < stripped.length) {
    if (!isWs(stripped[i])) {
      out += stripped[i++]
      continue
    }

    let j = i
    let blanked = false

    while (j < stripped.length && isWs(stripped[j])) {
      if (!isWs(original[j])) blanked = true
      j++
    }

    if (!blanked) {
      out += stripped.slice(i, j)
      i = j
      continue
    }

    // Real whitespace before the first and after the last removed character;
    // everything between them (type text, and any line breaks inside it) goes.
    let k1 = i
    let k2 = j - 1

    while (isWs(original[k1])) k1++
    while (isWs(original[k2])) k2--

    const pre = original.slice(i, k1)
    const post = original.slice(k2 + 1, j)

    if (post.includes('\n')) {
      out += pre + post // e.g. an interface between two statements
    } else if (pre.includes('\n')) {
      out += pre // e.g. `  private _view…` → `  _view…`
    } else {
      const atLineStart = i === 0 || stripped[i - 1] === '\n'
      const before = out[out.length - 1]
      const after = stripped[j]
      let sep = ''

      const lastLine = original.slice(original.lastIndexOf('\n', k2) + 1)

      if (atLineStart) sep = pre
      // A removed type spanned a line break between two members/statements:
      // `_a?: T\n  private _b` → keep them on separate lines.
      else if (stripped.slice(i, j).includes('\n') && isWord(before) && isWord(after)) sep = '\n' + lastLine.match(/^[ \t]*/)[0]
      else if (isWord(before) && isWord(after)) sep = ' '
      else if ((pre || post) && !/[),;\]}.]/.test(after ?? '') && before !== '(') sep = ' '

      out += sep
    }

    i = j
  }

  return out
}

// Strip mode refuses three TypeScript constructs that emit code. Rewrite them
// into plain TypeScript first, so every file stays in strip mode (transform
// mode reformats the whole file and keeps type-only imports).
// Index just past a string or template literal starting at `i` (templates with
// their ${…} nesting).
function skipLiteral (code, i) {
  const q = code[i++]

  while (i < code.length && code[i] !== q) {
    if (code[i] === '\\') { i += 2; continue }
    if (q === '`' && code[i] === '$' && code[i + 1] === '{') { i = matchClose(code, i + 1); continue }
    i++
  }

  return i + 1
}

// Index just past the bracket that closes the one at `open`, skipping strings,
// comments and template literals.
function matchClose (code, open) {
  const pairs = { '(': ')', '[': ']', '{': '}' }
  const stack = [pairs[code[open]]]
  let i = open + 1

  while (i < code.length && stack.length) {
    const c = code[i]
    const next = code[i + 1]

    if (c === '/' && next === '*') { i = code.indexOf('*/', i + 2) + 2; continue }
    if (c === '/' && next === '/') { i = code.indexOf('\n', i); continue }
    if (c === "'" || c === '"' || c === '`') { i = skipLiteral(code, i); continue }
    if (pairs[c]) stack.push(pairs[c])
    else if (c === stack[stack.length - 1]) stack.pop()
    i++
  }

  return i
}

// End of a field initializer that starts at `i`: the first newline (or `;`)
// outside brackets and literals.
function initializerEnd (code, i) {
  const start = i

  while (i < code.length && code[i] !== ';') {
    const c = code[i]

    if (c === '\n') {
      // A line break ends it unless the expression plainly continues:
      // `a ?\n b`, `a\n  ? b\n  : c`, `a &&\n b`, `foo\n  .bar()`.
      const before = code.slice(start, i).trimEnd()
      const after = code.slice(i + 1).trimStart()

      if (!/[=+\-*/%&|^!?:,.<>]$/.test(before) && !/^(\?\??|:|&&|\|\||\.(?!\.\.)|[+\-*/%](?![/*])|,)/.test(after)) break
    }

    if (c === '(' || c === '[' || c === '{') { i = matchClose(code, i); continue }
    if (c === "'" || c === '"' || c === '`') { i = skipLiteral(code, i); continue }
    i++
  }

  return i
}

// Lit decorators → plain Lit, as tools/README describes:
//   @property(o)/@state() accessor x = v → static properties { x: o }, this.x = v in the constructor
//   @consume({ context, subscribe }) accessor x = v → ContextConsumer whose callback sets this.x
//   @provide({ context }) accessor x = v → ContextProvider + get/set x that calls setValue
//   @query('sel') accessor x → get x () { return this.renderRoot?.querySelector('sel') ?? null }
//   @customElement('tag') class X → customElements.define('tag', X) after the class (if not defined)
// Browsers don't run decorators or `accessor` fields yet; class fields would shadow Lit's accessors.
function transformDecorators (code) {
  if (!/^\s*@(property|state|consume|provide|query|customElement)\(/m.test(code)) return code

  const usesContext = { consumer: false, provider: false }
  const tail = [] // customElements.define calls, appended after each class
  const classRe = /(^|\n)([ \t]*)(@customElement\(\s*(['"][^'"]+['"])\s*\)\s*\n[ \t]*)?((?:export\s+(?:default\s+)?)?(?:abstract\s+)?class\s+([\w$]+)[^{]*)\{/g
  let out = ''
  let last = 0
  let m

  while ((m = classRe.exec(code))) {
    const [whole, lead, indent, decorator, tag, head, name] = m
    const bodyOpen = m.index + whole.length - 1
    const bodyClose = matchClose(code, bodyOpen) - 1
    let body = code.slice(bodyOpen + 1, bodyClose)
    const props = []
    const inits = []
    const extras = []

    body = body.replace(/^([ \t]*)@(property|state|consume|provide|query)\(([^\n]*)\)[ \t]*\n[ \t]*((?:(?:private|protected|public|readonly|override|declare)\s+)*)accessor\s+([\w$]+)\??/gm,
      (dm, ind, kind, args, mods, field, offset, all) => `${ind}\u0000${kind}\u0001${args}\u0001${field}\u0000`)

    // Now each marked member is followed by its type annotation and initializer.
    body = body.replace(/\u0000(\w+)\u0001([^\u0001]*)\u0001([\w$]+)\u0000/g, (mk, kind, args, field, offset, all) => {
      // Skip the type annotation up to `=` (depth 0, not `=>`) or end of line.
      let i = offset + mk.length
      let depth = 0
      let init = null

      while (i < all.length && all[i] !== '\n') {
        const c = all[i]

        if (c === '=' && all[i + 1] === '>') { i += 2; continue }
        if ('([{<'.includes(c)) depth++
        else if (')]}>'.includes(c)) depth--
        else if (c === '=' && depth === 0) { init = i + 1; break }
        i++
      }

      // Mark the span to delete; collected below.
      const end = init === null ? i : initializerEnd(all, init)
      const value = init === null ? null : all.slice(init, end).trim()

      if (kind === 'property') props.push(`    ${field}: ${args.trim() || '{}'},`)
      if (kind === 'state') props.push(`    ${field}: { state: true },`)
      if (kind === 'query') {
        extras.push(`  get ${field} () {\n    return this.renderRoot?.querySelector(${args.trim()}) ?? null\n  }`)
      } else if (kind === 'consume') {
        usesContext.consumer = true
        if (value !== null) inits.push(`this.${field} = ${value}`)
        inits.push(`new ContextConsumer(this, { ...${args.trim()}, callback: (value) => { this.${field} = value } })`)
      } else if (kind === 'provide') {
        usesContext.provider = true
        inits.unshift(`this.__${field}Provider = new ContextProvider(this, ${args.trim()})`)
        extras.push(`  get ${field} () {\n    return this.__${field}\n  }\n\n  set ${field} (value) {\n    this.__${field}Provider.setValue(value)\n    this.__${field} = value\n  }`)
        if (value !== null) inits.push(`this.${field} = ${value}`)
      } else if (value !== null) {
        inits.push(`this.${field} = ${value}`)
      }

      return `\u0002${end - offset - mk.length}\u0002`
    })

    // Delete each member's leftover type annotation/initializer (length recorded above).
    body = body.replace(/\u0002(\d+)\u0002/g, '\u0003$1\u0003')
    while (body.includes('\u0003')) {
      const at = body.indexOf('\u0003')
      const close = body.indexOf('\u0003', at + 1)
      const len = Number(body.slice(at + 1, close))

      body = body.slice(0, at) + body.slice(close + 1 + len)
    }
    body = body.replace(/^[ \t]+$/gm, '').replace(/\n{3,}/g, '\n\n')

    let insert = ''

    if (props.length) insert += `\n  static properties = {\n${props.join('\n')}\n  }\n`

    if (inits.length) {
      const ctor = body.match(/\n([ \t]*)constructor\s*\(/)

      if (ctor) {
        const superCall = body.indexOf('super(', ctor.index)
        const at = body.indexOf('\n', matchClose(body, body.indexOf('(', superCall)))

        body = body.slice(0, at) + inits.map(s => `\n    ${s.replace(/\n/g, '\n  ')}`).join('') + body.slice(at)
      } else {
        insert += `\n  constructor () {\n    super()\n${inits.map(s => `    ${s.replace(/\n/g, '\n  ')}`).join('\n')}\n  }\n`
      }
    }

    if (extras.length) insert += `\n${extras.join('\n\n')}\n`

    out += code.slice(last, m.index) + lead + indent + head + '{' + insert + body + '}'
    last = bodyClose + 1

    if (decorator) {
      tail.push([last, `\n\nif (!customElements.get(${tag})) customElements.define(${tag}, ${name})`])
    }
  }

  if (last === 0) return code

  out += code.slice(last)

  // customElements.define after each decorated class: find the class end again in `out`.
  for (const [, define] of tail) {
    const name = define.match(/, ([\w$]+)\)$/)[1]
    const classStart = out.search(new RegExp(`class\\s+${name}\\b[^{]*\\{`))
    const open = out.indexOf('{', classStart)
    const close = matchClose(out, open)

    out = out.slice(0, close) + define + out.slice(close)
  }

  // lit/decorators.js exports only decorators: drop the import. Add the context classes.
  out = out.replace(/^import\s*\{[^}]*\}\s*from\s*['"]lit\/decorators\.js['"];?[ \t]*\n/gm, '')

  const needed = [usesContext.consumer && 'ContextConsumer', usesContext.provider && 'ContextProvider'].filter(Boolean)

  if (needed.length) out = `import { ${needed.join(', ')} } from '@lit/context'\n` + out

  return out
}

function preTransform (code) {
  code = transformDecorators(code)

  // <T>expr type assertions → expr. A cast has no runtime effect, and strip mode
  // refuses the angle-bracket form. Only where an expression starts, so generic
  // calls like foo<T>(x) are untouched.
  code = code.replace(/(?<=(?:[=(,:?]|\breturn)\s*)<([A-Za-z][\w$.]*(?:\[\])?)>(?=\s*[\w$(])/g, '')

  // enum X { A = expr, … } (explicit values only) → const X = Object.freeze({ A: expr, … })
  code = code.replace(/^(\s*(?:export\s+)?)enum\s+([\w$]+)\s*\{([^}]*)\}/gm, (m, lead, name, body) => {
    const members = body.split(',').map(s => s.trim()).filter(Boolean)

    if (!members.every(mem => /^[\w$]+\s*=/.test(mem))) return m

    const entries = members.map(mem => {
      const [key, ...value] = mem.split('=')

      return `  ${key.trim()}: ${value.join('=').trim()}`
    })

    return `${lead}const ${name} = Object.freeze({\n${entries.join(',\n')}\n})`
  })

  // constructor (private a: A, public b) { … } → constructor (a: A, b) { this.a = a; this.b = b; … }
  const ctor = /constructor\s*\(/g
  let match

  while ((match = ctor.exec(code))) {
    const open = match.index + match[0].length - 1
    let depth = 0
    let close = open

    for (; close < code.length; close++) {
      if (code[close] === '(') depth++
      if (code[close] === ')' && --depth === 0) break
    }

    const params = code.slice(open + 1, close)
    const modifier = /^(\s*(?:\/\/[^\n]*\n\s*)*)((?:public|private|protected|readonly)\s+)+/
    const names = []
    const rewritten = splitTopLevel(params).map(param => {
      if (!modifier.test(param)) return param

      const bare = param.replace(modifier, '$1')

      names.push(bare.replace(/\/\/[^\n]*\n/g, '').trim().match(/^[\w$]+/)[0])

      return bare
    })

    if (!names.length) continue

    const bodyOpen = code.indexOf('{', close)
    const lineStart = code.lastIndexOf('\n', match.index) + 1
    const indent = code.slice(lineStart, match.index).match(/^[ \t]*/)[0] + '  '
    const assignments = names.map(n => `\n${indent}this.${n} = ${n}`).join('')

    code = code.slice(0, open + 1) + rewritten.join(',') + code.slice(close, bodyOpen + 1) + assignments + code.slice(bodyOpen + 1)
    ctor.lastIndex = open + 1
  }

  return code
}

// The code of a file with comments, string contents and template-literal text
// blanked (${…} kept), for "is this name used as a value?" checks.
function codeOnly (code) {
  let out = ''
  let i = 0
  const depth = [] // template nesting: brace depth at each ${

  while (i < code.length) {
    const c = code[i]
    const next = code[i + 1]

    if (c === '/' && next === '*') { const end = code.indexOf('*/', i + 2); i = end < 0 ? code.length : end + 2; continue }
    if (c === '/' && next === '/') { const end = code.indexOf('\n', i); i = end < 0 ? code.length : end; continue }

    if (c === "'" || c === '"') {
      i++
      while (i < code.length && code[i] !== c && code[i] !== '\n') i += code[i] === '\\' ? 2 : 1
      i++
      out += ' '
      continue
    }

    if (c === '`' || (c === '}' && depth.length && depth[depth.length - 1] === 0)) {
      if (c === '}') depth.pop()
      i++
      while (i < code.length && code[i] !== '`' && !(code[i] === '$' && code[i + 1] === '{')) i += code[i] === '\\' ? 2 : 1
      if (code[i] === '$') { depth.push(0); i += 2 } else i++
      out += ' '
      continue
    }

    if (depth.length) {
      if (c === '{') depth[depth.length - 1]++
      if (c === '}') depth[depth.length - 1]--
    }

    out += c
    i++
  }

  return out
}

// Split a parameter list on commas that aren't inside (), <>, {}, [].
function splitTopLevel (s) {
  const parts = []
  let depth = 0
  let start = 0

  for (let i = 0; i < s.length; i++) {
    const c = s[i]

    if ('(<{['.includes(c)) depth++
    else if (')>}]'.includes(c) && s[i - 1] !== '=') depth--
    else if (c === ',' && depth === 0) {
      parts.push(s.slice(start, i))
      start = i + 1
    }
  }

  parts.push(s.slice(start))

  return parts
}

const report = { strip: 0, transform: 0, js: 0 }
const referencedAssets = new Set()
const usedIcons = new Set()

for (const file of files) {
  let code = readFileSync(join(from, file), 'utf8')

  if (file.endsWith('.ts')) {
    code = preTransform(code)

    try {
      const stripped = stripTypeScriptTypes(code, { mode: 'strip' })

      code = process.env.NO_TIDY ? stripped : tidyBlanks(code, stripped)
      report.strip++
    } catch {
      code = stripTypeScriptTypes(code, { mode: 'transform' })
      report.transform++
      console.warn(`  transform mode: ${file}`)
    }
  } else {
    report.js++
  }

  // import './x.css' → importCss(…): Vite injects plain .css imports into <head>.
  let needsImportCss = false

  code = code.replace(/^import\s*(['"])(\.[^'"]+\.css)\1;?[ \t]*$/gm, (m, q, spec) => {
    needsImportCss = true

    return `importCss(new URL(${q}${spec}${q}, import.meta.url))`
  })

  // import styles from './x.styles.css' → a constructable stylesheet (vite-plugin-lit-css).
  let needsLoadSheet = false

  code = code.replace(/^import\s+([\w$]+)\s+from\s*(['"])(\.[^'"]+\.css)\2;?[ \t]*$/gm, (m, name, q, spec) => {
    needsLoadSheet = true

    return `const ${name} = await loadSheet(new URL(${q}${spec}${q}, import.meta.url))`
  })

  // import '~icons/<set>/<name>' (unplugin-icons) → this package's icons.js, which
  // defines the same icon-<set>-<name> elements; SVGs fetched once, below.
  let needsIcons = false

  code = code.replace(/^import\s*(['"])~icons\/([\w-]+)\/([\w-]+)\1;?[ \t]*\n/gm, (m, q, set, icon) => {
    usedIcons.add(`${set}/${icon}`)
    if (needsIcons) return ''
    needsIcons = true

    return '\u0004ICONS\u0004\n'
  })

  // import x from './x.png' → its URL (Vite's asset import). The file is
  // copied alongside, even from outside `from` (e.g. ../icons-png).
  code = code.replace(/^import\s+([\w$]+)\s+from\s*(['"])(\.[^'"]+\.(?:png|svg|jpe?g|gif|webp|ico))\2;?[ \t]*$/gm,
    (m, name, q, spec) => {
      referencedAssets.add(resolve(dirname(join(from, file)), spec))

      return `const ${name} = new URL(${q}${spec}${q}, import.meta.url).href`
    })

  // require('./x.ttl') used inline (webpack raw loader) → a constant fetched at
  // the top of the module.
  const hoisted = []

  code = code.replace(/\brequire\(\s*(['"])(\.[^'"]+\.(?:ttl|n3|txt))\1\s*\)/g, (m, q, spec) => {
    const name = `__${spec.replace(/^.*\//, '').replace(/\W/g, '_')}`

    if (!hoisted.some(h => h.name === name)) hoisted.push({ name, spec, q })

    return name
  })

  if (hoisted.length) {
    const lines = hoisted.map(({ name, spec, q }) => `const ${name} = await (await fetch(new URL(${q}${spec}${q}, import.meta.url))).text()`)
    const lastImport = [...code.matchAll(/^import[^\n]*\n/gm)].pop()
    const at = lastImport ? lastImport.index + lastImport[0].length : 0

    code = code.slice(0, at) + lines.join('\n') + '\n' + code.slice(at)
  }

  // import x from './x.ttl' → the file's text (Vite's raw plugin).
  // Also `import { x } from './x.ttl'`: babel-plugin-inline-import binds the text
  // to whatever name the import declares.
  code = code.replace(/^import\s+(?:([\w$]+)|\{\s*([\w$]+)\s*\})\s+from\s*(['"])(\.[^'"]+\.ttl)\3;?[ \t]*$/gm,
    (m, name, named, q, spec) => `const ${name ?? named} = await (await fetch(new URL(${q}${spec}${q}, import.meta.url))).text()`)

  // import … from 'x' | export … from 'x' | import 'x' | import('x')
  code = code.replace(/(\bfrom\s*|\bimport\s*\(?\s*)(['"])([^'"\n]+)\2/g,
    (m, lead, q, spec) => `${lead}${q}${rewriteSpecifier(spec, file)}${q}`)

  // (after the specifier rewrite: these helpers only exist in the output)
  const helper = (name) => {
    let rel = relative(dirname(join(to, file)), join(to, name))

    return rel.startsWith('.') ? rel : './' + rel
  }

  if (needsLoadSheet) code = `import { loadSheet } from '${helper('loadSheet.js')}'\n` + code
  code = code.replace('\u0004ICONS\u0004', `import '${helper('icons.js')}'`)

  // (after the specifier rewrite: importCss.js only exists in the output)
  if (needsImportCss) {
    let rel = relative(dirname(join(to, file)), join(to, 'importCss.js'))

    if (!rel.startsWith('.')) rel = './' + rel
    code = `import { importCss } from '${rel}'\n` + code
  }

  // rdflib/lib/tf-types holds only types; one file imports from it without `import type`.
  code = code.replace(/^import \{[^}]*\} from 'rdflib\/lib\/tf-types'\n/gm, '')

  // Tidy what blanked-out types leave behind.
  code = code.split('\n').map(line => line.trimEnd()).join('\n').replace(/\n{3,}/g, '\n\n')

  const outFile = join(to, file.replace(/\.ts$/, '.js'))

  mkdirSync(dirname(outFile), { recursive: true })
  writeFileSync(outFile, code)
}

// Package paths in CSS @import (webpack resolves them; browsers apply no importmap
// to CSS): config cssImports { "solid-ui/theme.css": "../src/styles/theme.css" }.
// @custom-media definitions: config customMedia { "file": "<css with @custom-media>", "import": "solid-ui/breakpoints.css" }
const CUSTOM_MEDIA = config.customMedia
  ? [...readFileSync(resolve(base, config.customMedia.file), 'utf8').matchAll(/@custom-media\s+(--[\w-]+)\s+([^;]+);/g)].map(m => [m[1], m[2].trim()])
  : []
const CSS_IMPORTS = Object.fromEntries(Object.entries(config.cssImports ?? {}).map(([k, v]) => [k, resolve(base, v)]))

for (const asset of assets) {
  const target = join(to, asset)

  mkdirSync(dirname(target), { recursive: true })

  if (asset.endsWith('.css') && (Object.keys(CSS_IMPORTS).length || CUSTOM_MEDIA.length)) {
    let css = readFileSync(join(from, asset), 'utf8')

    // @media (--name) → the query, and drop the @import that defined it (no
    // browser supports @custom-media yet; upstream's CSS build substitutes it).
    if (CUSTOM_MEDIA.length && CUSTOM_MEDIA.some(([name]) => css.includes(`(${name})`))) {
      for (const [name, query] of CUSTOM_MEDIA) css = css.split(`(${name})`).join(query)
      css = css.replace(new RegExp(`^@import\\s+(?:url\\()?(['"])${config.customMedia.import.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}\\1\\)?;?[ \\t]*\n`, 'm'), `/* @custom-media from ${config.customMedia.import} substituted below by tools/convert.mjs */\n`)
    }

    css = css.replace(/@import\s+(?:url\()?(['"])([^'"]+)\1\)?/g, (m, q, spec) => {
      if (!CSS_IMPORTS[spec]) return m

      let rel = relative(dirname(target), CSS_IMPORTS[spec])

      if (!rel.startsWith('.')) rel = './' + rel

      return m.replace(spec, rel)
    })

    writeFileSync(target, css)
  } else {
    copyFileSync(join(from, asset), target)
  }
}

for (const [path, content] of Object.entries(GENERATED)) {
  writeFileSync(join(to, path), content)
}

for (const source of referencedAssets) {
  const target = resolve(to, relative(from, source))

  mkdirSync(dirname(target), { recursive: true })
  copyFileSync(source, target)
}

if (files.some(f => /^import\s*['"]\.[^'"]+\.css['"]/m.test(readFileSync(join(from, f), 'utf8')))) {
  writeFileSync(join(to, 'importCss.js'), `// Stands in for Vite's CSS injection: a plain \`import './x.css'\` becomes
// importCss(new URL('./x.css', import.meta.url)), a <link> in <head>, once per file.

const added = new Set()

export function importCss (url) {
  const href = String(url)

  if (added.has(href) || typeof document === 'undefined') return

  added.add(href)

  const link = document.createElement('link')

  link.rel = 'stylesheet'
  link.href = href
  document.head.append(link)
}
`)
}

if (files.some(f => /^import\s+[\w$]+\s+from\s*['"]\.[^'"]+\.css['"]/m.test(readFileSync(join(from, f), 'utf8')))) {
  writeFileSync(join(to, 'loadSheet.js'), `// Stands in for vite-plugin-lit-css: \`import styles from './x.styles.css'\` becomes
// await loadSheet(new URL('./x.styles.css', import.meta.url)), a CSSStyleSheet Lit
// accepts in \`static styles\`. Constructable sheets ignore @import.

const cache = new Map()

export function loadSheet (url) {
  const key = String(url)

  if (!cache.has(key)) {
    cache.set(key, fetch(key).then(async (response) => {
      if (!response.ok) throw new Error(\`loadSheet: \${response.status} \${key}\`)

      const sheet = new CSSStyleSheet()

      sheet.replaceSync(await response.text())

      return sheet
    }))
  }

  return cache.get(key)
}
`)
}

if (usedIcons.size) {
  // Same element shape as solidos-toolkit's unplugin-icons compiler:
  // <icon-set-name>, shadow root with ':host { display: inline-flex; }' and the svg at 100%.
  const defs = []

  for (const id of [...usedIcons].sort()) {
    const [set, icon] = id.split('/')
    const response = await fetch(`https://api.iconify.design/${set}/${icon}.svg`)

    if (!response.ok) throw new Error(`icon ${id}: ${response.status}`)

    const svg = (await response.text()).trim().replace(/ width="1em" height="1em"/, ' width="100%" height="100%"')

    defs.push(`defineIcon('icon-${set}-${icon}', '${svg.replace(/'/g, "\\'")}')`)
  }

  writeFileSync(join(to, 'icons.js'), `// The ~icons/<set>/<name> imports of this package (unplugin-icons upstream),
// fetched from Iconify by tools/convert.mjs. Lucide: ISC; svg-spinners: MIT.

function defineIcon (tagName, svg) {
  if (customElements.get(tagName)) return

  customElements.define(tagName, class extends HTMLElement {
    constructor () {
      super()
      this.attachShadow({ mode: 'open' }).innerHTML = '<style>:host { display: inline-flex; }</style>' + svg
    }
  })
}

${defs.join('\n')}
`)
}

// Second pass. Upstream imports some types without `import type`; tsc elides
// them, type stripping can't know to. Drop any imported/re-exported name that
// the target module doesn't actually export at runtime.

const outFiles = files.map(f => join(to, f.replace(/\.ts$/, '.js')))
const exportCache = new Map()

function runtimeExports (file, seen = new Set()) {
  if (exportCache.has(file)) return exportCache.get(file)
  if (seen.has(file) || !existsSync(file)) return null // outside the converted set: leave alone

  seen.add(file)

  const code = readFileSync(file, 'utf8')
  const names = new Set()

  for (const [, name] of code.matchAll(/^export\s+(?:async\s+)?(?:function\*?|class|const|let|var)\s+([A-Za-z_$][\w$]*)/gm)) names.add(name)
  if (/^export\s+default\b/m.test(code)) names.add('default')

  for (const [, list] of code.matchAll(/^export\s*\{([^}]*)\}/gm)) {
    for (const part of list.split(',').map(s => s.trim()).filter(Boolean)) {
      names.add(part.split(/\s+as\s+/).pop().trim())
    }
  }

  for (const [, spec] of code.matchAll(/^export\s*\*\s*from\s*['"]([^'"]+)['"]/gm)) {
    if (!spec.startsWith('.') && !BARE_MODULES[spec]) return null // re-exports a package: can't enumerate

    const inner = runtimeExports(BARE_MODULES[spec] ?? resolve(dirname(file), spec), seen)

    if (!inner) return null

    inner.forEach(n => n !== 'default' && names.add(n))
  }

  exportCache.set(file, names)

  return names
}

const BARE_TYPES = config.bareTypes ?? {}

let dropped = 0

for (const file of outFiles) {
  const code = readFileSync(file, 'utf8')
  const stubs = []
  const blockComments = [...code.matchAll(/\/\*[\s\S]*?\*\//g)].map(c => [c.index, c.index + c[0].length])
  const inComment = offset => blockComments.some(([a, b]) => offset >= a && offset < b)

  let fixed = code.replace(/^(import|export)(\s*)\{([^}]*)\}(\s*from\s*)(['"])([^'"]+)\5/gm,
    (m, kw, sp, list, fromPart, q, spec, offset) => {
      if (inComment(offset)) return m

      let has

      if (spec.startsWith('.') || BARE_MODULES[spec]) {
        const exports = runtimeExports(BARE_MODULES[spec] ?? resolve(dirname(file), spec))

        if (!exports) return m

        has = name => exports.has(name)
      } else if (BARE_TYPES[spec]) {
        has = name => !BARE_TYPES[spec].includes(name)
      } else {
        return m
      }

      const parts = list.split(',').map(s => s.trim()).filter(Boolean)
      const nameOf = part => part.replace(/^type\s+/, '').split(/\s+as\s+/)[0].trim()
      const localOf = part => part.replace(/^type\s+/, '').split(/\s+as\s+/).pop().trim()
      const kept = parts.filter(part => has(nameOf(part)))

      if (kept.length === parts.length) return m

      const removed = parts.filter(p => !kept.includes(p))

      dropped += removed.length
      console.warn(`  type-only ${removed.join(', ')} ← ${spec} in ${relative(to, file)}`)

      if (kw === 'import') stubs.push(...removed.map(localOf))

      return kept.length
        ? `${kw}${sp}{ ${kept.join(', ')} }${fromPart}${q}${spec}${q}`
        : `// (type-only ${kw} removed: ${removed.join(', ')} from '${spec}')`
    })

  // A dropped name still used as a value was `undefined` in upstream's bundle
  // too (a missing export). Say so, rather than turn it into a ReferenceError.
  for (const name of stubs) {
    const live = codeOnly(fixed)

    if (new RegExp(`\\b${name}\\b`).test(live)) {
      fixed = fixed.replace(/^((?:import[^\n]*\n|\/\/ \(type-only[^\n]*\n)+)/m,
        `$1const ${name} = undefined // upstream imports this, but it is never exported: undefined in their bundle too\n`)
      console.warn(`  ${name} is used as a value in ${relative(to, file)}: declared undefined`)
    }
  }

  if (fixed !== code) writeFileSync(file, fixed)
}

// Recorded, deliberate edits to the output: config patches [{ file, find, replace, why }].
for (const { file, find, replace, why } of config.patches ?? []) {
  const target = join(to, file)
  const code = readFileSync(target, 'utf8')

  if (!code.includes(find)) throw new Error(`patch for ${file} no longer applies (${why})`)

  writeFileSync(target, code.replace(find, replace))
  console.log(`  patched ${file}: ${why}`)
}

console.log(`${files.length} files, ${assets.length + referencedAssets.size} assets: ${report.strip} stripped, ${report.transform} transformed, ${report.js} already JS; ${dropped} type-only names dropped`)
