import { importCss } from '../importCss.js'
/** Project-local: currently unused component. Keep temporarily; do not add new usage. */
/**
 * Profile Editing App Pane
 *
 * Unlike view panes, this is available any place whatever the real subject,
 * and allows the user to edit their own profile.
 *
 * Usage: paneRegistry.register('/profile/editProfile.view')
 * or standalone script adding onto existing mashlib.
 */

// (type-only import removed: PaneDefinition from 'pane-registry')
import { NamedNode, Store } from 'rdflib'
import { icons, login, ns, widgets } from 'solid-ui'
import { EditContactsSection } from './EditContactsCard.js'
import { EditFriendsSection } from './EditFriendsCard.js'
import { EditSocialSection } from './EditSocialCard.js'
import { EditProfileCommunitiesSection } from './EditCommunitiesCard.js'
importCss(new URL('../ProfileView.css', import.meta.url))
import { EditCVSection } from './EditCVCard.js'
import { EditOtherPreferencesSection } from './EditOtherPreferences.js'
import { skipLabelsFromTabbing } from '../rdfFormsHelper.js'

const editProfileView = {
  global: true,

  icon: icons.iconBase + 'noun_492246.svg',

  name: 'editProfile',

  label: () => null, // don't use this in the normal solid-panes dispatching

  render: function (_subject, context) {
    const dom = context.dom
    const store = context.session.store

    // Use <section> as the main container for better semantics
    const div = dom.createElement('section')
    div.setAttribute('data-testid', 'profile-editor')
    div.setAttribute('role', 'region')
    div.setAttribute('aria-label', 'Edit your profile')
    let editableProfile

    // Pane root content. The page-level <main> landmark is on the shell's #MainContent.
    const main = dom.createElement('div')
    main.setAttribute('id', 'profile-edit-main-content')
    main.setAttribute('aria-busy', 'true')
    main.setAttribute('tabindex', '-1')
    main.classList.add('profile-grid', 'no-focus-ring')
    const mainHeading = dom.createElement('h1')
    mainHeading.classList.add('visually-hidden')
    mainHeading.textContent = 'Edit Profile'
    main.appendChild(mainHeading)
    div.appendChild(main)

    // Use <aside> for the status area
    const statusArea = dom.createElement('aside')
    statusArea.classList.add('p-sm')
    statusArea.setAttribute('role', 'status')
    statusArea.setAttribute('aria-live', 'polite')
    statusArea.setAttribute('aria-atomic', 'true')
    const ensureStatusArea = () => {
      if (!statusArea.isConnected) {
        div.appendChild(statusArea)
      }
    }

    const profileContext = {
      dom: dom,
      div: main,
      statusArea: statusArea,
      me: null
    }

    login.ensureLoadedProfile(profileContext)
      .then(theContext => {
        const me = theContext.me

        const profile = me.doc()
        if (!store.updater) {
          throw new Error('Store has no updater')
        }
        if (store.any(me, ns.solid('editableProfile'))) {
          editableProfile = store.any(me, ns.solid('editableProfile'))
        } else if (store.updater.editable(profile.uri, store)) {
          editableProfile = profile
        } else {
          ensureStatusArea()
          statusArea.appendChild(widgets.errorMessageBlock(dom, `⚠️ Your profile ${profile} is not editable, so we cannot do much here.`, 'straw'))
          return
        }

        // Render each section as a card with consistent classes
        // Your contact information Section
        main.appendChild(EditContactsSection(context, me))

        // Resume Section
        main.appendChild(EditCVSection(context, me, editableProfile, store))

        // Social Accounts Section
        main.appendChild(EditSocialSection(context, me, editableProfile, store))

        // Other preferences Section
        main.appendChild(EditOtherPreferencesSection(context, me, editableProfile, store))

        // People you know Section
        main.appendChild(EditFriendsSection(context, me, editableProfile))

        // Communities you participate in Section
        main.appendChild(EditProfileCommunitiesSection(context, me, editableProfile))

        // Ensure keyboard navigation skips labels (including those rendered as links).
        skipLabelsFromTabbing(main)

        main.setAttribute('aria-busy', 'false')
        main.focus()

      }).catch(error => {
        ensureStatusArea()
        statusArea.appendChild(widgets.errorMessageBlock(dom, error, '#fee'))
        main.setAttribute('aria-busy', 'false')
      })
    return div
  }
}

export default editProfileView
