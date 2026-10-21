import { LiveStore, NamedNode, Literal, Node } from 'rdflib'
import { ns } from 'solid-ui'
// (type-only import removed: RoleDetails from './types.js')

const educationMembershipType = ns.schema('EducationalOccupationalCredential')
const vcardOrganizationType = ns.vcard('Organization').value
const schemaNamespace = 'http://schema.org/'

function localNameFromUri(uri) {
  const value = (uri || '').trim()
  if (!value) return ''
  const fragmentMatch = value.match(/[#/]([^#/]+)$/)
  return fragmentMatch?.[1] || value
}

function nodeToDisplayText(store, node, doc) {
  if (!node) return ''
  if (node.termType === 'Literal') return node.value
  if (node.termType === 'NamedNode') {
    const label = store.anyJS(node, ns.rdfs('label'), null, doc)
    if (label) return label
    return localNameFromUri(node.value)
  }
  return ''
}

function roleTypeFromMembership(store, membership, doc) {
  const roleTypes = store
    .each(membership, ns.rdf('type'), null, doc)
    .filter((node) => node.termType === 'NamedNode' && node.value.startsWith(ns.solid('').value))

  const matched = roleTypes.find((node) => {
    const local = localNameFromUri((node).value)
    return local === 'PastRole' || local === 'CurrentRole' || local === 'FutureRole'
  }) || roleTypes[0]

  return nodeToDisplayText(store, matched, doc)
}

function organizationTypeFromNode(store, organization, doc) {
  const classification = store.any(organization, ns.org('classification'), null, doc)
  const classificationText = nodeToDisplayText(store, classification, doc)
  if (classificationText) return classificationText

  const organizationTypes = store
    .each(organization, ns.rdf('type'), null, doc)
    .filter((node) => node.termType === 'NamedNode')
    .filter((node) => (node).value !== vcardOrganizationType)

  const preferred = organizationTypes.find((node) => (node).value.startsWith(schemaNamespace)) || organizationTypes[0]
  return nodeToDisplayText(store, preferred, doc)
}

function isEducationMembership(store, membership, doc) {
  return store.holds(membership, ns.rdf('type'), educationMembershipType, doc)
}
// Copied from CVPresenter and modified for new functionallity.
/* Restructure for new design - notes */
/* The design displays in reverse chronological order: removed rolesByType and
   just sort the Roles */
/* Data */
/* isCurrentRole: derive from no end date. Use to force behaviour of ui - enforcing an end date
    when not selected. */
/* Dates: change to Month Year format: Leave dates as startDate and endDate, populate
   these dates by using the 1st day of the month for the month that is selected.
   Compute at render time */
/* New Types:
    Organization type: use org:classification note on vocab it's noted that
    this is a somewhat unsettled type.
    Organization location: use org:location note: this is for a person's location inside
    an organization I'm thinking this is what we want here.
    Role description: use schema:description on the membership. Not sure if this is the best choice but what I could find.
*/

function getRoles(
  store,
  subject
) {
  const roles = []
  const deduped = new Map()
  const doc = subject.doc()
  const memberships = store
    .each(null, ns.org('member'), subject, doc)
    .filter((membership) => !isEducationMembership(store, membership, doc))

  for (const membership of memberships) {
    let orgHomePage, orgNameGiven, publicIdName, roleName, publicId, orgType, orgLocation
    // Things should have start dates but we will be very lenient in this view
    const startDate = store.any(membership, ns.schema('startDate'), null, doc)
    const endDate = store.any(membership, ns.schema('endDate'), null, doc)
    const roleDescription = store.anyJS(membership, ns.schema('description'), null, doc)
    const isCurrentRole = !endDate
    const roleType = roleTypeFromMembership(store, membership, doc)

    const organization = store.any(membership, ns.org('organization'), null, doc)
    if (organization) {
      orgNameGiven = store.anyJS(organization, ns.schema('name'), null, doc)
      orgHomePage = store.any(organization, ns.schema('uri'), null, doc)
      orgType = organizationTypeFromNode(store, organization, doc)
      orgLocation = store.any(organization, ns.org('location'), null, doc)
      publicId = store.any(organization, ns.solid('publicId'), null, doc)
    }
    if (publicId) {
      publicIdName = store.anyJS(publicId, ns.schema('name'), null, doc)
    }
    const orgName = publicIdName || orgNameGiven

    const escoRole = store.any(membership, ns.org('role'), null, doc)
    if (escoRole) {
      roleName = store.anyJS(escoRole, ns.schema('name'), null, doc)
    }
    const roleText0 = store.anyJS(membership, ns.vcard('role'), null, doc)
    const title = (roleText0 && roleName) ? roleName + ' - ' + roleText0
      : roleText0 || roleName

    const item = {
      title,
      roleType,
      entryNode: membership,
      startDate: startDate,
      endDate,
      isCurrentRole,
      orgName,
      orgPublicId: publicId?.value || '',
      orgType,
      orgLocation,
      orgHomePage,
      description: roleDescription || undefined
    }

    const dedupeKey = [
      item.title || '',
      item.orgName || '',
      item.startDate?.value || '',
      item.endDate?.value || ''
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

  deduped.forEach((item) => roles.push(item))
  return roles
}

function sortRoles(roles) {
  return roles.sort((x, y) => {
    // Current roles first
    const xIsCurrent = !x.endDate
    const yIsCurrent = !y.endDate
    if (xIsCurrent !== yIsCurrent) return xIsCurrent ? -1 : 1

    const xEnd = x.endDate?.value || ''
    const yEnd = y.endDate?.value || ''
    if (xEnd !== yEnd) return yEnd.localeCompare(xEnd)

    const xStart = x.startDate?.value || ''
    const yStart = y.startDate?.value || ''
    return yStart.localeCompare(xStart)
  })
}

export function presentCV(
  subject,
  store
) {

 const roles = getRoles(store, subject)
 // Most recent thing most relevant -> sort by end date
 const sortedRoles = sortRoles(roles)

  return sortedRoles
}
