import { LiveStore, NamedNode } from 'rdflib'
import { ns } from 'solid-ui'
// (type-only import removed: Account, SocialPresentation from './types.js')
import { expandRdfList } from '../shared/rdfList.js'
import {
  ensureSocialOntologyLoaded,
  homepageForAccount,
  iconForAccount,
  nameForAccount
} from './helpers.js'

export function presentSocial(
  subject,
  store
) {
  function accountAsObject (ac) {
    return {
      name: nameForAccount(store, ac),
      icon: iconForAccount(store, ac),
      homepage: homepageForAccount(store, ac),
      entryNode: ac
    }

  }

  // we need to load the social media accounts ontology to be able to query all data needed
  ensureSocialOntologyLoaded(store)

  const accountNodes = store.each(subject, ns.foaf('account'))
  const accountThings = accountNodes.flatMap(node => expandRdfList(store, node))
  // Deduplicate by foaf:accountName value
  const accountNameSet = new Set()
  const accounts = []
  for (const ac of accountThings) {
    if (ac.termType === 'NamedNode') {
      const accountNameNode = store.any(ac, ns.foaf('accountName'))
      const dedupeKey = accountNameNode ? accountNameNode.value : ''
      if (!accountNameSet.has(dedupeKey)) {
        accountNameSet.add(dedupeKey)
        accounts.push(accountAsObject(ac))
      }
    }
  }
  if (!accounts.length) return { accounts: [] }
  return { accounts }
}
