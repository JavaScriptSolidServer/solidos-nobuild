import { NamedNode, LiveStore } from 'rdflib'
// (type-only import removed: ContactInfo from './sections/contactInfo/types.js')
import { presentSocial } from './sections/social/selectors.js'
// (type-only import removed: SocialPresentation from './sections/social/types.js')
import { presentSkillDetails } from './sections/skills/selectors.js'
// (type-only import removed: SkillDetails from './sections/skills/types.js')
import { presentLanguages } from './sections/languages/selectors.js'
// (type-only import removed: LanguageDetails from './sections/languages/types.js')
import { presentCV } from './sections/resume/selectors.js'
// (type-only import removed: RoleDetails from './sections/resume/types.js')
import { presentContactInfo } from './sections/contactInfo/selectors.js'
// (type-only import removed: EducationDetails from './sections/education/types.js')
import { presentEducation } from './sections/education/selectors.js'
// (type-only import removed: ProjectDetails from './sections/projects/types.js')
import { presentProjects } from './sections/projects/selectors.js'
import { presentProfile } from './sections/heading/selectors.js'
// (type-only import removed: ProfileDetails from './sections/heading/types.js')
// (type-only import removed: BioDetails from './sections/bio/types.js')
import { presentBio } from './sections/bio/selectors.js'

export async function presentProfileViewModel(subject, store) {
  const profileDetails = presentProfile(subject, store)
  const contactInfo = presentContactInfo(subject, store)
  const skills = presentSkillDetails(subject, store)
  const languages = presentLanguages(subject, store)
  const education = presentEducation(subject, store)
  const projects = await presentProjects(subject, store)
  const bioDetails = presentBio(subject, store)
  const social = presentSocial(subject, store)
  const cvDetails = presentCV(subject, store)

  return {
    profileDetails,
    social,
    contactInfo,
    skills,
    languages,
    education,
    projects,
    bioDetails,
    cvDetails
  }
}