import { LiveStore, NamedNode, Node, literal, st, sym } from 'rdflib'
import { ns } from 'solid-ui'
// (type-only import removed: ContactAddressRow, ContactMutationPlan, ContactPointRow from './types.js')
// (type-only import removed: MutationOps from '../shared/types.js')
import { collectLinkedNodeStatements, collectNodeStatements, findExistingNode, runUpdateTransport, shouldForceDocumentPutForStatements } from '../shared/rdfMutationHelpers.js'
import { createIdNode } from '../shared/idNodeFactory.js'
import { contactInfoMutationSaveFailedDebugText, saveContactUpdatesFailedMessageText, updaterUnsupportedStoreErrorMessageText } from '../../texts.js'
import { error as debugError } from '../../utils/debug.js'

function buildPhoneStatements(subject, doc, node, phone) {
  const normalizedValue = phone.value.startsWith('tel:') ? phone.value : `tel:${phone.value}`
  const valueNode = sym(normalizedValue)
  const inserts = [
    st(subject, ns.vcard('hasTelephone'), node, doc),
    st(node, ns.vcard('value'), valueNode, doc)
  ]

  if (phone.type) {
    inserts.push(st(node, ns.rdf('type'), ns.vcard(phone.type), doc))
  }

  return inserts
}

function buildEmailStatements(subject, doc, node, email) {
  const normalizedValue = email.value.startsWith('mailto:') ? email.value : `mailto:${email.value}`
  const valueNode = sym(normalizedValue)
  const inserts = [
    st(subject, ns.vcard('hasEmail'), node, doc),
    st(node, ns.vcard('value'), valueNode, doc)
  ]

  if (email.type) {
    inserts.push(st(node, ns.rdf('type'), ns.vcard(email.type), doc))
  }

  return inserts
}

function buildAddressStatements(subject, doc, node, address) {
  const inserts = [st(subject, ns.vcard('hasAddress'), node, doc)]

  if (address.type) inserts.push(st(node, ns.rdf('type'), ns.vcard(address.type), doc))
  if (address.streetAddress) inserts.push(st(node, ns.vcard('street-address'), literal(address.streetAddress), doc))
  if (address.locality) inserts.push(st(node, ns.vcard('locality'), literal(address.locality), doc))
  if (address.region) inserts.push(st(node, ns.vcard('region'), literal(address.region), doc))
  if (address.postalCode) inserts.push(st(node, ns.vcard('postal-code'), literal(address.postalCode), doc))
  if (address.countryName) inserts.push(st(node, ns.vcard('country-name'), literal(address.countryName), doc))

  return inserts
}

async function mutatePhoneEntries(store, subject, phoneOps, documentTextCache) {
  const doc = subject.doc()
  const existingPhoneNodes = store.each(subject, ns.vcard('hasTelephone'), null, doc)
  const deletions = []
  const insertions = []

  phoneOps.remove.forEach((phone) => {
    if (!phone.entryNode) return
    const existingNode = findExistingNode(existingPhoneNodes, phone.entryNode)
    if (existingNode) {
      const linkedPhoneStatements = collectLinkedNodeStatements(store, subject, ns.vcard('hasTelephone'), doc)
      const matchingLinkStatement = linkedPhoneStatements.linkStatements.find((statement) => statement.object?.value === existingNode.value)
      if (matchingLinkStatement) {
        deletions.push(matchingLinkStatement)
      }
      deletions.push(...collectNodeStatements(store, existingNode, doc))
    }
  })

  phoneOps.update.forEach((phone) => {
    if (!phone.entryNode) return
    const existingNode = findExistingNode(existingPhoneNodes, phone.entryNode)
    if (!existingNode) {
      insertions.push(...buildPhoneStatements(subject, doc, createIdNode(doc), phone))
      return
    }
    const linkedPhoneStatements = collectLinkedNodeStatements(store, subject, ns.vcard('hasTelephone'), doc)
    const matchingLinkStatement = linkedPhoneStatements.linkStatements.find((statement) => statement.object?.value === existingNode.value)
    if (matchingLinkStatement) {
      deletions.push(matchingLinkStatement)
    }
    deletions.push(...collectNodeStatements(store, existingNode, doc))
    insertions.push(...buildPhoneStatements(subject, doc, existingNode, phone))
  })

  phoneOps.create.forEach((phone) => {
    insertions.push(...buildPhoneStatements(subject, doc, createIdNode(doc), phone))
  })

  const shouldSerializeDocument = await shouldForceDocumentPutForStatements(store, doc, insertions, undefined, { documentTextCache })

  await runUpdateTransport(store, doc, deletions, insertions, {
    unsupportedMessage: updaterUnsupportedStoreErrorMessageText,
    failureMessage: 'Failed to save contact info updates',
    documentTextCache,
    useDavFallback: false,
    usePutFallback: shouldSerializeDocument,
    forcePut: shouldSerializeDocument
  })
}

async function mutateEmailEntries(store, subject, emailOps, documentTextCache) {
  const doc = subject.doc()
  const existingEmailNodes = store.each(subject, ns.vcard('hasEmail'), null, doc)
  const deletions = []
  const insertions = []

  emailOps.remove.forEach((email) => {
    if (!email.entryNode) return
    const existingNode = findExistingNode(existingEmailNodes, email.entryNode)
    if (existingNode) {
      const linkedEmailStatements = collectLinkedNodeStatements(store, subject, ns.vcard('hasEmail'), doc)
      const matchingLinkStatement = linkedEmailStatements.linkStatements.find((statement) => statement.object?.value === existingNode.value)
      if (matchingLinkStatement) {
        deletions.push(matchingLinkStatement)
      }
      deletions.push(...collectNodeStatements(store, existingNode, doc))
    }
  })

  emailOps.update.forEach((email) => {
    if (!email.entryNode) return
    const existingNode = findExistingNode(existingEmailNodes, email.entryNode)
    if (!existingNode) {
      insertions.push(...buildEmailStatements(subject, doc, createIdNode(doc), email))
      return
    }
    deletions.push(...collectNodeStatements(store, existingNode, doc))
    insertions.push(...buildEmailStatements(subject, doc, existingNode, email))
  })

  emailOps.create.forEach((email) => {
    insertions.push(...buildEmailStatements(subject, doc, createIdNode(doc), email))
  })

  const shouldSerializeDocument = await shouldForceDocumentPutForStatements(store, doc, insertions, undefined, { documentTextCache })

  await runUpdateTransport(store, doc, deletions, insertions, {
    unsupportedMessage: updaterUnsupportedStoreErrorMessageText,
    failureMessage: 'Failed to save contact info updates',
    documentTextCache,
    useDavFallback: false,
    usePutFallback: shouldSerializeDocument,
    forcePut: shouldSerializeDocument
  })
}

async function mutateAddressEntries(store, subject, addressOps, documentTextCache) {
  const doc = subject.doc()
  const existingAddressNodes = store.each(subject, ns.vcard('hasAddress'), null, doc)
  const deletions = []
  const insertions = []

  addressOps.remove.forEach((address) => {
    if (!address.entryNode) return
    const existingNode = findExistingNode(existingAddressNodes, address.entryNode)
    if (existingNode) {
      const linkedAddressStatements = collectLinkedNodeStatements(store, subject, ns.vcard('hasAddress'), doc)
      const matchingLinkStatement = linkedAddressStatements.linkStatements.find((statement) => statement.object?.value === existingNode.value)
      if (matchingLinkStatement) {
        deletions.push(matchingLinkStatement)
      }
      deletions.push(...collectNodeStatements(store, existingNode, doc))
    }
  })

  addressOps.update.forEach((address) => {
    if (!address.entryNode) return
    const existingNode = findExistingNode(existingAddressNodes, address.entryNode)
    if (!existingNode) {
      insertions.push(...buildAddressStatements(subject, doc, createIdNode(doc), address))
      return
    }
    deletions.push(...collectNodeStatements(store, existingNode, doc))
    insertions.push(...buildAddressStatements(subject, doc, existingNode, address))
  })

  addressOps.create.forEach((address) => {
    insertions.push(...buildAddressStatements(subject, doc, createIdNode(doc), address))
  })

  const shouldSerializeDocument = await shouldForceDocumentPutForStatements(store, doc, insertions, undefined, { documentTextCache })

  await runUpdateTransport(store, doc, deletions, insertions, {
    unsupportedMessage: updaterUnsupportedStoreErrorMessageText,
    failureMessage: 'Failed to save contact info updates',
    documentTextCache,
    useDavFallback: false,
    usePutFallback: shouldSerializeDocument,
    forcePut: shouldSerializeDocument
  })
}

export async function processContactInfoMutations(store, subject, mutationPlan) {
  try {
    const documentTextCache = new Map()
    await mutatePhoneEntries(store, subject, mutationPlan.phoneOps, documentTextCache)
    await mutateEmailEntries(store, subject, mutationPlan.emailOps, documentTextCache)
    await mutateAddressEntries(store, subject, mutationPlan.addressOps, documentTextCache)
  } catch (error) {
    const rootError = error instanceof Error ? error : new Error(String(error))
    debugError(contactInfoMutationSaveFailedDebugText, rootError)
    throw new Error(saveContactUpdatesFailedMessageText, { cause: rootError })
  }
}
