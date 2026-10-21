#!/usr/bin/env python3
"""Names imported from a package that its published ES module doesn't export at
runtime: TypeScript types imported without `import type`. Feed the result into
the converter config's "bareTypes".

    python3 tools/check-bare-imports.py panes/profile-pane/src
"""
import json, pathlib, re, sys, urllib.request

CDN = {
    'rdflib': 'https://cdn.jsdelivr.net/npm/rdflib@2.4.1/+esm',
    'pane-registry': 'https://cdn.jsdelivr.net/npm/pane-registry@5.0.1/+esm',
    'solid-logic': 'https://cdn.jsdelivr.net/npm/solid-logic@6.0.0/+esm',
    'lit-html': 'https://cdn.jsdelivr.net/npm/lit-html@3.3.0/+esm',
    'uuid': 'https://cdn.jsdelivr.net/npm/uuid@14.0.2/+esm',
}

def exports(url):
    src = urllib.request.urlopen(url).read().decode()
    names = set(re.findall(r'export\s+(?:const|function|class|let|var)\s+([\w$]+)', src))
    for lst in re.findall(r'export\s*\{([^}]*)\}', src):
        names |= {p.strip().split(' as ')[-1].strip() for p in lst.split(',') if p.strip()}
    return names

known = {k: exports(u) for k, u in CDN.items()}
found = {}
for f in sorted(pathlib.Path(sys.argv[1]).rglob('*.js')):
    for m in re.finditer(r"import\s*\{([^}]*)\}\s*from\s*'([^'.][^']*)'", f.read_text(), re.S):
        mod = m.group(2)
        if mod not in known:
            continue
        for n in [p.strip().split(' as ')[0].replace('type ', '').strip() for p in m.group(1).split(',') if p.strip()]:
            if n not in known[mod]:
                found.setdefault(mod, set()).add(n)
                print(f'{f}: {n} from {mod}', file=sys.stderr)
print(json.dumps({k: sorted(v) for k, v in found.items()}, indent=2))
