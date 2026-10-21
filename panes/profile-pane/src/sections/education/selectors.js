import { LiveStore, NamedNode, Node } from 'rdflib'
import { ns } from 'solid-ui'
// (type-only import removed: EducationDetails from './types.js')

const educationMembershipType = ns.schema('EducationalOccupationalCredential')

function isEducationMembership(store, membership, doc) {
  return store.holds(membership, ns.rdf('type'), educationMembershipType, doc)
}

function getEducation(store, subject) {
  const education = []
  const deduped = new Map()
  const doc = subject.doc()
  const memberships = store
    .each(null, ns.org('member'), subject, doc)
    .filter((membership) => isEducationMembership(store, membership, doc))

  for (const membership of memberships) {
    const school = (store.anyJS(membership, ns.schema('name'), null, doc)) || ''
    const degree = (store.anyJS(membership, ns.schema('educationalCredentialAwarded'), null, doc)) || undefined
    const location = (store.anyJS(membership, ns.schema('location'), null, doc)) || undefined
    const startDate = (store.anyJS(membership, ns.schema('startDate'), null, doc)) || undefined
    const endDate = (store.anyJS(membership, ns.schema('endDate'), null, doc)) || undefined
    const description = (store.anyJS(membership, ns.schema('description'), null, doc)) || undefined

    const item = {
      school,
      degree,
      location,
      startDate,
      endDate,
      description,
      entryNode: membership
    }

    const dedupeKey = [
      item.school || '',
      item.degree || '',
      item.location || '',
      item.startDate || '',
      item.endDate || ''
    ].join('|')

    const existing = deduped.get(dedupeKey)
    if (!existing) {
      deduped.set(dedupeKey, item)
      continue
    }

    const existingIsNamed = (existing.entryNode).termType === 'NamedNode'
    const nextIsNamed = (item.entryNode).termType === 'NamedNode'
    if (!existingIsNamed && nextIsNamed) {
      deduped.set(dedupeKey, item)
    }
  }

  deduped.forEach((item) => education.push(item))
  return education
}

function sortEducation(education) {
  return education.sort((x, y) => {
    const xIsCurrent = !x.endDate
    const yIsCurrent = !y.endDate
    if (xIsCurrent !== yIsCurrent) return xIsCurrent ? -1 : 1

    const xEnd = x.endDate || ''
    const yEnd = y.endDate || ''
    if (xEnd !== yEnd) return yEnd.localeCompare(xEnd)

    const xStart = x.startDate || ''
    const yStart = y.startDate || ''
    return yStart.localeCompare(xStart)
  })
}

export function presentEducation(subject, store) {
  const education = getEducation(store, subject)
  return sortEducation(education)
}
