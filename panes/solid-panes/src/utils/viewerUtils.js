import { authn } from 'solid-logic'

// Long-lived UI (e.g. the header) outlives logins, so resolve the viewer on demand.
export async function getCurrentViewer () {
  return authn.currentUser() ?? await authn.checkUser()
}

// Relation of a viewer to a subject, without checking write access.
export function getViewerRelation (subject, viewer = authn.currentUser()) {
  const { value, uri } = (typeof viewer === 'object' && viewer !== null ? viewer : {})
  const viewerUri = typeof viewer === 'string' ? viewer : value || uri || null
  if (!viewerUri) return 'anonymous'
  return viewerUri === subject.value ? 'owner' : 'authenticated'
}
