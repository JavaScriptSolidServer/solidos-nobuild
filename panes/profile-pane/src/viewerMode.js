import { NamedNode } from 'rdflib'
import { authn, solidLogicSingleton } from 'solid-logic'
// (type-only import removed: ViewerMode from './types.js')
import {log } from './utils/debug.js'

export async function getViewerMode(subject) {
  let editable = false
  const currentUser = authn.currentUser()
  if (!currentUser) {
    return 'anonymous'
  }

  if (!currentUser.sameTerm(subject)) {
    return 'authenticated'
  }

  try {
    const profileDoc = subject.doc()
    editable = Boolean(solidLogicSingleton.store.updater?.editable?.(profileDoc))
  } catch {
    log('Resource could not be refreshed and is not editable.')
    return 'anonymous'
  }

  return editable ? 'owner' : 'anonymous'
}
