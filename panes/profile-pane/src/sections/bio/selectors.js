import { ns} from 'solid-ui'

import { LiveStore, NamedNode } from 'rdflib'

export const presentBio = (
  subject,
  store
) => {

  const description = store.anyJS(subject, ns.vcard('note'))

  return {
    description,
    entryNode: subject
  }
}
