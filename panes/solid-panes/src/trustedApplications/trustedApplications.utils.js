import { BlankNode, IndexedFormula, NamedNode, st, Literal, sym, Statement } from 'rdflib'
// (type-only import removed: Namespaces from 'solid-namespace')

export function getStatementsToDelete (
  origin,
  person,
  kb,
  ns
) {
  const applicationStatements = kb.statementsMatching(
    null,
    ns.acl('origin'),
    origin
  )
  const statementsToDelete = applicationStatements.reduce(
    (memo, st) => {
      return memo
        .concat(
          kb.statementsMatching(
            person,
            ns.acl('trustedApp'),
            st.subject
          )
        )
        .concat(kb.statementsMatching(st.subject))
    },
    []
  )
  return statementsToDelete
}

export function getStatementsToAdd (
  origin,
  nodeName,
  modes,
  person,
  ns
) {
  const application = new BlankNode(`bn_${nodeName}`) // NamedNode(`${person.doc().uri}#${nodeName}`)
  return [
    st(person, ns.acl('trustedApp'), application, person.doc()),
    st(application, ns.acl('origin'), origin, person.doc()),
    ...modes
      .map(mode => sym(mode))
      .map(mode => st(application, ns.acl('mode'), mode, person.doc()))
  ]
}

export function generateRandomString () {
  return Math.random().toString(36).substr(2, 5)
}
