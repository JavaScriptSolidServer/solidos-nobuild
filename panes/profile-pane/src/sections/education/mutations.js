import { LiveStore, NamedNode, Node, st, literal } from 'rdflib'
import { ns } from 'solid-ui'
// (type-only import removed: EducationMutationPlan, EducationRow from './types.js')
// (type-only import removed: MutationOps from '../shared/types.js')
import { collectNodeStatements, findExistingNode, runUpdateTransport, shouldForceDocumentPutForStatements } from '../shared/rdfMutationHelpers.js'
import { educationMutationSaveFailedDebugText, saveEducationUpdatesFailedMessageText, updaterUnsupportedStoreErrorMessageText } from '../../texts.js'
import { error as debugError } from '../../utils/debug.js'

const educationMembershipType = ns.schema('EducationalOccupationalCredential')

function isEducationMembership(store, node, doc) {
  return store.holds(node, ns.rdf('type'), educationMembershipType, doc)
}

function buildEducationStatements(
  subject,
  doc,
  node,
  education,
  includeMembershipLink = true
) {
  const inserts = includeMembershipLink ? [st(node, ns.org('member'), subject, doc)] : []
  inserts.push(st(node, ns.rdf('type'), educationMembershipType, doc))

  if (education.school) inserts.push(st(node, ns.schema('name'), literal(education.school), doc))
  if (education.degree) inserts.push(st(node, ns.schema('educationalCredentialAwarded'), literal(education.degree), doc))
  if (education.location) inserts.push(st(node, ns.schema('location'), literal(education.location), doc))
  if (education.startDate) inserts.push(st(node, ns.schema('startDate'), literal(education.startDate), doc))
  if (education.endDate) inserts.push(st(node, ns.schema('endDate'), literal(education.endDate), doc))
  if (education.description) inserts.push(st(node, ns.schema('description'), literal(education.description), doc))

  return inserts
}

async function mutateEducationEntries(store, subject, educationOps) {
  const doc = subject.doc()
  const existingEducationNodes = (store.each(null, ns.org('member'), subject, doc))
    .filter((node) => isEducationMembership(store, node, doc))
  const deletions = []
  const insertions = []

  educationOps.remove.forEach((education) => {
    if (!education.entryNode) return
    const existingNode = findExistingNode(existingEducationNodes, education.entryNode)
    if (existingNode) {
      deletions.push(...collectNodeStatements(store, existingNode, doc))
    }
  })

  educationOps.update.forEach((education) => {
    if (!education.entryNode) return
    const existingNode = findExistingNode(existingEducationNodes, education.entryNode)
    if (!existingNode) {
      insertions.push(...buildEducationStatements(subject, doc, store.bnode(), education))
      return
    }
    deletions.push(...collectNodeStatements(store, existingNode, doc))
    insertions.push(...buildEducationStatements(subject, doc, existingNode, education))
  })

  educationOps.create.forEach((education) => {
    insertions.push(...buildEducationStatements(subject, doc, store.bnode(), education))
  })

  const shouldSerializeDocument = await shouldForceDocumentPutForStatements(store, doc, insertions)

  await runUpdateTransport(store, doc, deletions, insertions, {
    unsupportedMessage: updaterUnsupportedStoreErrorMessageText,
    failureMessage: 'Failed to save education updates',
    useDavFallback: false,
    usePutFallback: shouldSerializeDocument,
    forcePut: shouldSerializeDocument
  })
}

export async function processEducationMutations(store, subject, mutationPlan) {
  try {
    await mutateEducationEntries(store, subject, mutationPlan)
  } catch (error) {
    const rootError = error instanceof Error ? error : new Error(String(error))
    debugError(educationMutationSaveFailedDebugText, rootError)
    throw new Error(saveEducationUpdatesFailedMessageText, { cause: rootError })
  }
}
