import { LiveStore, NamedNode, Node, st, literal, sym } from 'rdflib'
import { ns } from 'solid-ui'
// (type-only import removed: ProfileBasicRow, HeadingMutationPlan from './types.js')
// (type-only import removed: MutationOps from '../shared/types.js')
import { collectLinkedNodeStatements, collectNodeStatements, findExistingNode, replacePredicateStatements, runUpdateTransport, shouldForceDocumentPutForStatements } from '../shared/rdfMutationHelpers.js'
import { createIdNode } from '../shared/idNodeFactory.js'
// (type-only import removed: ContactAddressRow, ContactPointRow from '../contactInfo/types.js')
import { headingMutationSaveFailedDebugText, saveHeadingUpdatesFailedMessageText, updaterUnsupportedStoreErrorMessageText } from '../../texts.js'
import { error as debugError } from '../../utils/debug.js'

function splitPronouns(value) {
  const normalized = (value || '').trim()
  if (!normalized) return {}

  const [subjectPronounRaw, objectPronounRaw] = normalized.split('/').map((part) => part.trim())
  const subjectPronoun = subjectPronounRaw || undefined
  const objectPronoun = objectPronounRaw || undefined

  return { subjectPronoun, objectPronoun }
}

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

function findOpWithExistingEntry(ops, existingNodes) {
  return ops.find((op) => Boolean(op.entryNode) && Boolean(findExistingNode(existingNodes, op.entryNode)))
}

function findCreateOp(ops) {
  return ops.find((op) => !op.entryNode)
}

async function mutatePhoneEntry(store, subject, phoneOps, documentTextCache) {
  const doc = subject.doc()
  const existingPhoneNodes = store.each(subject, ns.vcard('hasTelephone'), null, doc)
  const deletions = []
  const insertions = []

  const removePhone = findOpWithExistingEntry(phoneOps.remove, existingPhoneNodes)
  const updatePhone = findOpWithExistingEntry(phoneOps.update, existingPhoneNodes)
  const createPhone = findCreateOp(phoneOps.create) || phoneOps.create[0]

  if (removePhone?.entryNode) {
    const existingNode = findExistingNode(existingPhoneNodes, removePhone.entryNode)
    if (existingNode) {
      const linkedPhoneStatements = collectLinkedNodeStatements(store, subject, ns.vcard('hasTelephone'), doc)
      const matchingLinkStatement = linkedPhoneStatements.linkStatements.find((statement) => statement.object?.value === existingNode.value)
      if (matchingLinkStatement) {
        deletions.push(matchingLinkStatement)
      }
      deletions.push(...collectNodeStatements(store, existingNode, doc))
    }
  }

  if (updatePhone) {
    const existingNode = findExistingNode(existingPhoneNodes, updatePhone.entryNode)
    if (existingNode) {
      deletions.push(...collectNodeStatements(store, existingNode, doc))
      insertions.push(...buildPhoneStatements(subject, doc, existingNode, updatePhone))
    }
  }

  if (createPhone) {
    insertions.push(...buildPhoneStatements(subject, doc, createIdNode(doc), createPhone))
  }

  const shouldSerializeDocument = await shouldForceDocumentPutForStatements(store, doc, insertions, undefined, { documentTextCache })

  await runUpdateTransport(store, doc, deletions, insertions, {
    unsupportedMessage: updaterUnsupportedStoreErrorMessageText,
    failureMessage: 'Failed to save heading updates',
    documentTextCache,
    useDavFallback: false,
    usePutFallback: shouldSerializeDocument,
    forcePut: shouldSerializeDocument
  })
}

async function mutateEmailEntry(store, subject, emailOps, documentTextCache) {
  const doc = subject.doc()
  const existingEmailNodes = store.each(subject, ns.vcard('hasEmail'), null, doc)
  const deletions = []
  const insertions = []

  const removeEmail = findOpWithExistingEntry(emailOps.remove, existingEmailNodes)
  const updateEmail = findOpWithExistingEntry(emailOps.update, existingEmailNodes)
  const createEmail = findCreateOp(emailOps.create) || emailOps.create[0]

  if (removeEmail?.entryNode) {
    const existingNode = findExistingNode(existingEmailNodes, removeEmail.entryNode)
    if (existingNode) {
      const linkedEmailStatements = collectLinkedNodeStatements(store, subject, ns.vcard('hasEmail'), doc)
      const matchingLinkStatement = linkedEmailStatements.linkStatements.find((statement) => statement.object?.value === existingNode.value)
      if (matchingLinkStatement) {
        deletions.push(matchingLinkStatement)
      }
      deletions.push(...collectNodeStatements(store, existingNode, doc))
    }
  }

  if (updateEmail) {
    const existingNode = findExistingNode(existingEmailNodes, updateEmail.entryNode)
    if (existingNode) {
      deletions.push(...collectNodeStatements(store, existingNode, doc))
      insertions.push(...buildEmailStatements(subject, doc, existingNode, updateEmail))
    }
  }

  if (createEmail) {
    insertions.push(...buildEmailStatements(subject, doc, createIdNode(doc), createEmail))
  }

  const shouldSerializeDocument = await shouldForceDocumentPutForStatements(store, doc, insertions, undefined, { documentTextCache })

  await runUpdateTransport(store, doc, deletions, insertions, {
    unsupportedMessage: updaterUnsupportedStoreErrorMessageText,
    failureMessage: 'Failed to save heading updates',
    documentTextCache,
    useDavFallback: false,
    usePutFallback: shouldSerializeDocument,
    forcePut: shouldSerializeDocument
  })
}

async function mutateAddressEntry(store, subject, addressOps, documentTextCache) {
  const doc = subject.doc()
  const existingAddressNodes = store.each(subject, ns.vcard('hasAddress'), null, doc)
  const deletions = []
  const insertions = []

  const removeAddress = findOpWithExistingEntry(addressOps.remove, existingAddressNodes)
  const updateAddress = findOpWithExistingEntry(addressOps.update, existingAddressNodes)
  const createAddress = findCreateOp(addressOps.create) || addressOps.create[0]

  if (removeAddress?.entryNode) {
    const existingNode = findExistingNode(existingAddressNodes, removeAddress.entryNode)
    if (existingNode) {
      const linkedAddressStatements = collectLinkedNodeStatements(store, subject, ns.vcard('hasAddress'), doc)
      const matchingLinkStatement = linkedAddressStatements.linkStatements.find((statement) => statement.object?.value === existingNode.value)
      if (matchingLinkStatement) {
        deletions.push(matchingLinkStatement)
      }
      deletions.push(...collectNodeStatements(store, existingNode, doc))
    }
  }

  if (updateAddress) {
    const existingNode = findExistingNode(existingAddressNodes, updateAddress.entryNode)
    if (existingNode) {
      deletions.push(...collectNodeStatements(store, existingNode, doc))
      insertions.push(...buildAddressStatements(subject, doc, existingNode, updateAddress))
    }
  }

  if (createAddress) {
    insertions.push(...buildAddressStatements(subject, doc, createIdNode(doc), createAddress))
  }

  const shouldSerializeDocument = await shouldForceDocumentPutForStatements(store, doc, insertions, undefined, { documentTextCache })

  await runUpdateTransport(store, doc, deletions, insertions, {
    unsupportedMessage: updaterUnsupportedStoreErrorMessageText,
    failureMessage: 'Failed to save heading updates',
    documentTextCache,
    useDavFallback: false,
    usePutFallback: shouldSerializeDocument,
    forcePut: shouldSerializeDocument
  })
}

async function mutateBasicProfileEntry(store, subject, basicOps, documentTextCache) {
  const doc = subject.doc()
  const deletions = []
  const insertions = []

  const replaceLiteralField = (predicate, value) => {
    const normalized = (value || '').trim()
    const nextObject = normalized ? literal(normalized) : null
    replacePredicateStatements(store, subject, predicate, doc, deletions, insertions, nextObject)
  }

  const replacePhotoField = (value) => {
    const normalized = (value || '').trim()
    const nextObject = !normalized
      ? null
      : (normalized.startsWith('http://') || normalized.startsWith('https://'))
        ? sym(normalized)
        : literal(normalized)
    replacePredicateStatements(store, subject, ns.vcard('hasPhoto'), doc, deletions, insertions, nextObject)
  }

  const replacePronounFields = (value) => {
    const { subjectPronoun, objectPronoun } = splitPronouns(value)

    replacePredicateStatements(
      store,
      subject,
      ns.solid('preferredSubjectPronoun'),
      doc,
      deletions,
      insertions,
      subjectPronoun ? literal(subjectPronoun) : null
    )
    replacePredicateStatements(
      store,
      subject,
      ns.solid('preferredObjectPronoun'),
      doc,
      deletions,
      insertions,
      objectPronoun ? literal(objectPronoun) : null
    )
    replacePredicateStatements(
      store,
      subject,
      ns.solid('preferredRelativePronoun'),
      doc,
      deletions,
      insertions,
      null
    )
  }

  const applyBasics = (basic, clearAll = false) => {
    const data = clearAll
      ? {
          name: '',
          nickname: '',
          pronouns: '',
          dateOfBirth: '',
          imageSrc: ''
        }
      : basic

    replaceLiteralField(ns.vcard('fn'), data.name)
    // Keep foaf:nick in sync where available in existing data.
    replaceLiteralField(ns.foaf('nick'), data.nickname)
    replaceLiteralField(ns.vcard('nickname'), data.nickname)
    replaceLiteralField(ns.vcard('bday'), data.dateOfBirth)
    replacePronounFields(data.pronouns)
    replacePhotoField(data.imageSrc)
  }

  const removeBasic = basicOps.remove[0]
  const updateBasic = basicOps.update[0]
  const createBasic = basicOps.create[0]

  const selectedBasic = updateBasic || createBasic || removeBasic
  if (selectedBasic) {
    applyBasics(selectedBasic, Boolean(removeBasic && !updateBasic && !createBasic))
  }

  const shouldSerializeDocument = await shouldForceDocumentPutForStatements(store, doc, insertions, undefined, { documentTextCache })

  await runUpdateTransport(store, doc, deletions, insertions, {
    unsupportedMessage: updaterUnsupportedStoreErrorMessageText,
    failureMessage: 'Failed to save heading updates',
    documentTextCache,
    useDavFallback: false,
    usePutFallback: shouldSerializeDocument,
    forcePut: shouldSerializeDocument
  })
}

export async function processHeadingMutations(store, subject, mutationPlan) {
  try {
    const documentTextCache = new Map()
    await mutateBasicProfileEntry(store, subject, mutationPlan.basicOps, documentTextCache)
    await mutatePhoneEntry(store, subject, mutationPlan.phoneOps, documentTextCache)
    await mutateEmailEntry(store, subject, mutationPlan.emailOps, documentTextCache)
    await mutateAddressEntry(store, subject, mutationPlan.addressOps, documentTextCache)
  } catch (error) {
    const rootError = error instanceof Error ? error : new Error(String(error))
    debugError(headingMutationSaveFailedDebugText, rootError)
    throw new Error(saveHeadingUpdatesFailedMessageText, { cause: rootError })
  }
}
