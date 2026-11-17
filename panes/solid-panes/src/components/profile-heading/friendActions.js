import { authn, store } from 'solid-logic'
import { st,} from 'rdflib'
import { ns } from 'solid-ui'
import { ensureStandardMutationPrefixes } from './editor/sections/shared/rdfMutationHelpers.js'
import { formatDisplayError } from './editor/utils/errorDisplay.js'

export const friendTexts = {
  add: 'Add as friend',
  exists: 'Already a friend',
  success: 'Friend was added!',
  duplicate: 'Friend already exists',
  loginRequired: 'Current user not found! Not logged in?'
}

function requireViewer (viewer) {
  if (!authn.currentUser()?.sameTerm(viewer)) {
    throw new Error(friendTexts.loginRequired)
  }
}

export async function checkFriend (viewer, subject) {
  await store.fetcher.load(viewer)
  requireViewer(viewer)
  return store.whether(viewer, ns.foaf('knows'), subject, viewer.doc()) > 0
}

export async function addFriend (viewer, subject) {
  requireViewer(viewer)
  if (await checkFriend(viewer, subject)) throw new Error(friendTexts.duplicate)
  ensureStandardMutationPrefixes(store)
  try {
    await store.updater.update([], [st(viewer, ns.foaf('knows'), subject, viewer.doc())])
  } catch (error) {
    if (formatDisplayError(error).includes('Unauthenticated')) {
      throw new Error(friendTexts.loginRequired)
    }
    throw error
  }
}
