#!/usr/bin/env node
// Carry an upstream release into this tree without losing the edits made here.
//
//   CONVERT_TO=/tmp/base node tools/convert.mjs <config with `from` at the OLD upstream>
//   CONVERT_TO=/tmp/new  node tools/convert.mjs <config with `from` at the NEW upstream>
//   node tools/merge3.mjs /tmp/base /tmp/new <our directory>
//
// A three-way merge, file by file: base = the old release converted, new = the new
// release converted, ours = what is here. New files are copied, removed files are
// deleted (kept, and reported, if edited here), changed files go through
// `git merge-file`. Conflicts are left in the file with markers and listed.
import { readdirSync, statSync, existsSync, readFileSync, copyFileSync, mkdirSync, rmSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { spawnSync } from 'node:child_process'

const [base, next, ours] = process.argv.slice(2)
if (!ours) { console.error('usage: merge3.mjs <base> <new> <ours>'); process.exit(1) }

const walk = (dir, rel = '') => !existsSync(dir) ? [] : readdirSync(join(dir, rel)).flatMap(name => {
  const r = rel ? rel + '/' + name : name
  return statSync(join(dir, r)).isDirectory() ? walk(dir, r) : [r]
})
const same = (a, b) => readFileSync(a).equals(readFileSync(b))
const inBase = new Set(walk(base)); const inNew = new Set(walk(next))
const out = { added: [], merged: [], conflict: [], removed: [], kept: [], clash: [] }

for (const f of inNew) {
  const o = join(ours, f); const n = join(next, f); const b = join(base, f)
  if (!inBase.has(f)) {
    if (existsSync(o) && !same(o, n)) { out.clash.push(f); continue }
    mkdirSync(dirname(o), { recursive: true }); copyFileSync(n, o); out.added.push(f)
  } else if (!same(b, n)) {
    if (!existsSync(o)) { out.clash.push(f + ' (changed upstream, absent here)'); continue }
    const r = spawnSync('git', ['merge-file', '-L', 'ours', '-L', 'base', '-L', 'upstream', o, b, n])
    ;(r.status === 0 ? out.merged : out.conflict).push(f)
  }
}
for (const f of inBase) {
  if (inNew.has(f)) continue
  const o = join(ours, f)
  if (!existsSync(o)) continue
  if (same(o, join(base, f))) { rmSync(o); out.removed.push(f) } else out.kept.push(f)
}
for (const [k, v] of Object.entries(out)) console.log(`${k}: ${v.length}${v.length && (k !== 'added' || v.length < 15) ? '\n  ' + v.join('\n  ') : ''}`)
process.exit(out.conflict.length || out.clash.length ? 2 : 0)
