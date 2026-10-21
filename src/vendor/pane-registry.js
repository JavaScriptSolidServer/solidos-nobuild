// pane-registry is published as CommonJS that builds its exports at runtime
// (r.list = [], r.byName = function …), so no CDN can derive named exports, and
// solid-panes imports { list, byName, register, … }. Upstream's bundler does that
// interop; this does it by hand. Everything is the one shared registry object.
import registry from 'https://cdn.jsdelivr.net/npm/pane-registry@5.0.1/+esm'

export const { list, paneForIcon, paneForPredicate, register, byName } = registry

export default registry
