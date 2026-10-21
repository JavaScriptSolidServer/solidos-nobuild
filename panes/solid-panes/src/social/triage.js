// (type-only import removed: DataBrowserContext from 'pane-registry')
import { IndexedFormula, NamedNode } from 'rdflib'
import { ns } from 'solid-ui'

function uniqueNamedNodes (nodes) {
  const seen = new Set()
  const unique = []

  for (const node of nodes) {
    const key = node?.value
    if (!key || seen.has(key)) continue
    seen.add(key)
    unique.push(node)
  }

  return unique
}

export function triageFriends (store, subject) {
  const outgoingFriends = uniqueNamedNodes(store.each(subject, ns.foaf('knows')))
  const incomingFriends = uniqueNamedNodes(
    store.each(undefined, ns.foaf('knows'), subject)
  )
  const confirmed = []
  const unconfirmed = []
  const requests = []

  for (const friend of outgoingFriends) {
    const isConfirmed = incomingFriends.some(incomingFriend => incomingFriend.sameTerm(friend))
    if (isConfirmed) {
      confirmed.push(friend)
    } else {
      unconfirmed.push(friend)
    }
  }

  for (const friend of incomingFriends) {
    const isAlreadyOutgoing = outgoingFriends.some(outgoingFriend => outgoingFriend.sameTerm(friend))
    if (!isAlreadyOutgoing) {
      requests.push(friend)
    }
  }

  return {
    acquaintances: outgoingFriends,
    confirmed,
    unconfirmed,
    requests
  }
}

export async function loadFriendshipTriage (
  context,
  subject
) {
  const store = context.session.store
  const fetcher = store.fetcher

  if (!fetcher || typeof fetcher.load !== 'function') {
    return triageFriends(store, subject)
  }

  try {
    await fetcher.load(subject.doc())
  } catch {
    // Continue with the store snapshot we already have.
  }

  const initialTriage = triageFriends(store, subject)
  const documentsToLoad = new Map()

  documentsToLoad.set(subject.doc().value, subject.doc())

  for (const friend of [...initialTriage.acquaintances, ...initialTriage.requests]) {
    documentsToLoad.set(friend.doc().value, friend.doc())
  }

  const incomingStatements = store.statementsMatching(undefined, ns.foaf('knows'), subject)
  for (const statement of incomingStatements) {
    const why = statement.why
    if (why?.value) {
      documentsToLoad.set(why.value, why)
    }
  }

  for (const target of documentsToLoad.values()) {
    try {
      await fetcher.load(target)
    } catch {
      // Keep partial results when one profile document fails to load.
    }
  }

  return triageFriends(store, subject)
}
