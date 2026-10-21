import { importCss } from './importCss.js'
import { html } from 'lit-html'
// (type-only import removed: DataBrowserContext from 'pane-registry')
import { NamedNode, LiveStore } from 'rdflib'
importCss(new URL('./ProfileView.css', import.meta.url))
importCss(new URL('./styles/CollapsibleSection.css', import.meta.url))
// (type-only import removed: Layout, ViewerMode from './types.js')
import { presentProfileViewModel } from './ProfileViewModelPresenter.js'
import { renderContactInfoSection } from './sections/contactInfo/ContactInfoSection.js'
import { renderLanguageSection } from './sections/languages/LanguageSection.js'
import { renderSkillsSection } from './sections/skills/SkillsSection.js'
// (type-only import removed: SkillDetails from './sections/skills/types.js')
// (type-only import removed: ContactInfo from './sections/contactInfo/types.js')
// (type-only import removed: LanguageDetails from './sections/languages/types.js')
import { renderCVSection } from './sections/resume/ResumeSection.js'
import { renderProjectSection } from './sections/projects/ProjectSection.js'
import { renderHeadingSection } from './sections/heading/HeadingSection.js'
import { renderBioSection } from './sections/bio/BioSection.js'
import { renderSocialSection } from './sections/social/SocialSection.js'
import { renderQRCodeSection } from './sections/qrcode/QRCodeSection.js'
import { getViewerMode } from './viewerMode.js'

function renderSidebar(
  store,
  subject,
  accounts,
  skills,
  languages,
  contactInfo,
  viewerMode,
  layout,
  onSaved
) {
  return html`
    <div
      class="profile__sidebar"
    >
      <aside class="profile__sidebar-content" aria-labelledby="profile-sidebar-heading">
        <h2 id="profile-sidebar-heading" class="sr-only">Profile sidebar</h2>
        ${renderSocialSection(store, subject, accounts, viewerMode, layout, onSaved)}
        ${renderSkillsSection(store, subject, skills, viewerMode, layout, onSaved)}
        ${renderLanguageSection(store, subject, languages, viewerMode, layout, onSaved)}
        ${renderContactInfoSection(store, subject, contactInfo, viewerMode, layout, onSaved)}
        ${renderQRCodeSection(subject, store)}
      </aside>
    </div>
  `
}

export async function ProfileView (
  subject,
  context,
  layout,
  onSaved
) {
  const store = context.session.store
  const viewerMode = await getViewerMode(subject)
  const theme = context.environment?.theme ?? 'light'
  const inputMode = context.environment?.inputMode ?? 'pointer'

  const viewModel = await presentProfileViewModel(subject, store)
  const profileDetails = viewModel.profileDetails
  const rolesByType = viewModel.cvDetails
  const skills = viewModel.skills
  const languages = viewModel.languages
  const projects = viewModel.projects
  const bioDetails = viewModel.bioDetails
  const accounts = viewModel.social
  const contactInfo = viewModel.contactInfo

  const headingSection = await renderHeadingSection(context, subject, profileDetails, viewerMode, layout,onSaved)
  const bioSection = renderBioSection(store, subject, bioDetails, viewerMode, layout, onSaved)
  const skillsSection = renderSkillsSection(store, subject, skills, viewerMode, layout, onSaved)
  const languageSection = renderLanguageSection(store, subject, languages, viewerMode, layout, onSaved)
  const cvSection = renderCVSection(store, subject, rolesByType, viewerMode, layout, onSaved)
  const projectSection = renderProjectSection(store, subject, projects, viewerMode, layout, onSaved)
  const socialSection = renderSocialSection(store, subject, accounts, viewerMode, layout, onSaved)
  const contactInfoSection = renderContactInfoSection(store, subject, contactInfo, viewerMode, layout, onSaved)
  const qrCodeSection = renderQRCodeSection(subject, store)

  if (layout === 'mobile') {
    return html`
      <div
        class="profile-pane-root"
        data-layout=${layout}
        data-theme=${theme}
        data-input-mode=${inputMode}
      >
        <main
          id="main-content"
          class="profile-grid"
          tabindex="-1"
        >
          ${headingSection}
          ${bioSection}
          ${skillsSection}
          ${languageSection}
          ${cvSection}
          ${projectSection}
          ${socialSection}
          ${contactInfoSection}
          ${qrCodeSection}
        </main>
      </div>
    `
  }

  return html`
    <div
      class="profile-pane-root"
      data-layout=${layout}
      data-theme=${theme}
      data-input-mode=${inputMode}
    >
      <div
        id="main-content"
        class="profile-grid"
        tabindex="-1"
      >

        <section class="profile__main">
          ${headingSection}
          ${bioSection}
          ${cvSection}
          ${projectSection}

        </section>
        ${renderSidebar(store, subject, accounts, skills, languages, contactInfo, viewerMode, layout, onSaved)}
      </div>
    </div>
  `
}
