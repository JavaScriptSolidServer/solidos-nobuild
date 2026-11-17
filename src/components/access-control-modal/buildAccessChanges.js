import { getAccessSubjectLabel } from './accessGrantDrafts.js'

export function buildAccessChanges ({
  pendingAccessGrants,
  generalAccessChanges,
  changedAccessGrants
}) {
  return [
    ...pendingAccessGrants.map(grant => ({
      subject: { type: grant.subjectType, iri: grant.subjectValue },
      role: grant.role,
      label: grant.label
    })),
    ...generalAccessChanges,
    ...changedAccessGrants.flatMap(({ subjects, role }) =>
      subjects.map(subject => ({
        subject,
        role,
        label: getAccessSubjectLabel(subject)
      }))
    )
  ]
}
