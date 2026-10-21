import { LiveStore, NamedNode, Node, Store } from 'rdflib'
import { ns, utils } from 'solid-ui'
// (type-only import removed: SkillDetails from './types.js')

export function skillAsText (store, sk) {
  if (sk.termType === 'Literal') return ''

  const directName = store.anyJS(sk, ns.schema('name'))
  if (directName) return directName

  // Canonical shape: entry node -> solid:publicId -> schema:name.
  const publicId = store.any(sk, ns.solid('publicId'))
  if (publicId && (publicId.termType === 'NamedNode' || publicId.termType === 'BlankNode')) {
    const name = store.anyJS(publicId, ns.schema('name'))
    if (name) return name
    if (publicId.termType === 'NamedNode') {
      return utils.label(publicId, true)
    }
  }

  return ''
}

export function presentSkillDetails(subject, store) {
  return store
    .each(subject, ns.schema('skills'))
    .filter((sk) => sk.termType !== 'Literal')
    .map((sk) => {
      const publicId = store.any(sk, ns.solid('publicId'))
      const publicIdUri = publicId
        ? (publicId.termType === 'BlankNode' ? `_:${publicId.value}` : publicId.value)
        : ''
      return {
        name: skillAsText(store, sk),
        publicId: publicIdUri,
        entryNode: sk
      }
    })
    .filter((detail) => detail.name !== '')
}

export function presentSkills(subject, store) {
  return presentSkillDetails(subject, store).map((detail) => detail.name)
}
