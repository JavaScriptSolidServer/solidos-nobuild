import { LiveStore, NamedNode, Node } from 'rdflib'
import { ns } from 'solid-ui'
// (type-only import removed: AddressDetails, ContactInfo, PointDetails from './types.js')

function termValue(term) {
  if (!term) return ''
  if (typeof term === 'string') return term
  return term.value || ''
}

function isEmailValue(value) {
  const normalized = (value || '').trim()
  if (!normalized) return false
  if (/^mailto:/i.test(normalized)) return true
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)
}

function isPhoneValue(value) {
  const normalized = (value || '').trim()
  if (!normalized) return false
  if (/^tel:/i.test(normalized)) return true
  return /^[+()\-\s\d]{5,}$/.test(normalized)
}

function resolvePointValueNode(
  store,
  entryNode,
  doc,
  kind
) {
  const expected = kind === 'email' ? isEmailValue : isPhoneValue

  const entryValue = termValue(entryNode)
  if (expected(entryValue)) return entryNode

  const inDocStatements = store.statementsMatching(entryNode, ns.vcard('value'), null, doc)
  const anyGraphStatements = store.statementsMatching(entryNode, ns.vcard('value'))

  for (const statement of [...inDocStatements, ...anyGraphStatements]) {
    const objectNode = statement.object
    if (expected(termValue(objectNode))) {
      return objectNode
    }
  }

  return null
}

function selectEmails(subject, store) {
  const emails = []

  const emailNodes = store.each(subject, ns.vcard('hasEmail'), null, subject.doc()) || null
  emailNodes.forEach((node) => {
    const valueNode = resolvePointValueNode(store, node, subject.doc(), 'email')
    if (!valueNode) return

    const type = store.any(node, ns.rdf('type'), null, subject.doc())
    emails.push({ entryNode: node, type, valueNode })
  })

  return emails
}
/* SAM need to look at this doesn't seem to be working
although it was working in add-to-contacts button */
function selectPhones(subject, store) {
  const phoneNumbers = []

  const phoneNodes = store.each(subject, ns.vcard('hasTelephone'), null, subject.doc()) || null
  phoneNodes.forEach((node) => {
    const valueNode = resolvePointValueNode(store, node, subject.doc(), 'phone')
    if (!valueNode) return

    const type = store.any(node, ns.rdf('type'), null, subject.doc())
    phoneNumbers.push({ entryNode: node, type, valueNode })
  })

  return phoneNumbers
}

function selectAddresses(subject, store) {
  const addresses = []

  const addressNodes = store.each(subject, ns.vcard('hasAddress'), null, subject.doc()) || null
  addressNodes.map((node) => {
    const streetAddress = termValue(
      store.any(node, ns.vcard('street-address'), null, subject.doc())
    )
    const locality = termValue(
      store.any(node, ns.vcard('locality'), null, subject.doc())
    )
    const region = termValue(
      store.any(node, ns.vcard('region'), null, subject.doc())
    )
    const postalCode = termValue(
      store.any(node, ns.vcard('postal-code'), null, subject.doc())
    )
    const countryName = termValue(
      store.any(node, ns.vcard('country-name'), null, subject.doc())
    )
    const type = store.any(node, ns.rdf('type'), null, subject.doc())

    addresses.push({
      entryNode: node,
      ...(type ? { type } : {}),
      streetAddress,
      locality,
      region,
      postalCode,
      countryName,
    })
  })
  return addresses
}

export function presentContactInfo(subject, store) {
  const emails = selectEmails(subject, store)
  const phones = selectPhones(subject, store)
  const addresses = selectAddresses(subject, store)

  return { emails, phones, addresses }
}
