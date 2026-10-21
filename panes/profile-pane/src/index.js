// (type-only import removed: DataBrowserContext from 'pane-registry')
import { NamedNode, LiveStore } from 'rdflib'
import { render } from 'lit-html'
import { ProfileView } from './ProfileView.js'
import { icons, ns } from 'solid-ui'
import { hydrateQRCodes } from './sections/qrcode/QRCodeCard.js'
import { createResizeDrivenSync } from './utils/resize.js'
// (type-only import removed: Layout from './types.js')
export {
  addMeToYourFriendsDiv,
  createAddMeToYourFriendsButton,
  saveNewThing,
  checkIfThingExists
} from './specialButtons/addMeToYourFriends.js'

const MOBILE_LAYOUT_MAX_WIDTH = 768
const HEADING_SECTION_SELECTOR = '[data-profile-section="heading"]'
const SOCIAL_SECTION_SELECTOR = '[data-profile-section="social"]'

async function loadExtendedProfile(store, subject) {
  const otherProfiles = store.each(
    subject,
    ns.rdfs('seeAlso'),
    null,
    subject.doc()
  )
  if (otherProfiles.length > 0) {
    await store.fetcher.load(otherProfiles)
  }
}

function measureLayout(context, root) {
  if (context.environment?.layout === 'mobile') {
    return 'mobile'
  }

  if (typeof window === 'undefined') {
    return 'desktop'
  }

  const measuredWidth = root?.getBoundingClientRect().width || window.innerWidth
  return measuredWidth <= MOBILE_LAYOUT_MAX_WIDTH ? 'mobile' : 'desktop'
}

function syncRenderedLayout(
  root,
  context,
  onLayoutChange
) {
  const updateLayout = () => {
    const nextLayout = measureLayout(context, root)
    if (nextLayout !== root.dataset.layout) {
      onLayoutChange(nextLayout)
    }
  }

  const grid = root.querySelector('.profile-grid')
  return createResizeDrivenSync(updateLayout, [root, grid])
}

function syncSocialSectionHeight(root) {
  const updateHeight = () => {
    const grid = root.querySelector('.profile-grid')
    const headingSection = root.querySelector(HEADING_SECTION_SELECTOR)
    const socialSection = root.querySelector(SOCIAL_SECTION_SELECTOR)

    if (!grid || !headingSection || !socialSection) {
      return
    }

    const isDesktopGrid = root.dataset.layout !== 'mobile' && getComputedStyle(grid).display === 'grid'
    if (!isDesktopGrid) {
      socialSection.style.removeProperty('min-height')
      return
    }

    const nextMinHeight = `${Math.ceil(headingSection.getBoundingClientRect().height)}px`
    if (socialSection.style.minHeight !== nextMinHeight) {
      socialSection.style.minHeight = nextMinHeight
    }
  }
  const headingSection = root.querySelector(HEADING_SECTION_SELECTOR)
  const socialSection = root.querySelector(SOCIAL_SECTION_SELECTOR)

  return createResizeDrivenSync(updateHeight, [root, headingSection, socialSection])
}

function applyEnvironmentAttributes(
  element,
  context
) {
  const layout = context.environment?.layout ?? 'desktop'
  const theme = context.environment?.theme ?? 'light'
  const inputMode = context.environment?.inputMode ?? 'pointer'

  element.classList.add('profile-pane-host')
  element.dataset.layout = layout
  element.dataset.theme = theme
  element.dataset.inputMode = inputMode
}

const Pane = {
  global: false,
  icon: icons.iconBase + 'noun_15059.svg',
  name: 'profile',
  label: function (
    subject,
    context
  ) {
    const t = context.session.store.findTypeURIs(subject)
    if (
      t[ns.vcard('Individual').uri] ||
      t[ns.foaf('Person').uri] ||
      t[ns.schema('Person').uri]
    ) {
      return 'Profile'
    }
    return null
  },
  render: (subject, context) => {
    const target = context.dom.createElement('div')
    const store = context.session.store
    let cleanupSocialSectionHeightSync = null
    let cleanupLayoutSync = null
    let currentLayout = measureLayout(context, target)

    applyEnvironmentAttributes(target, context)
    target.dataset.layout = currentLayout

    const renderWithData = async () => {
      applyEnvironmentAttributes(target, context)
      target.dataset.layout = currentLayout
      render(await ProfileView(subject, context, currentLayout, renderWithData), target)
      cleanupSocialSectionHeightSync?.()
      cleanupSocialSectionHeightSync = syncSocialSectionHeight(target)
      cleanupLayoutSync?.()
      cleanupLayoutSync = syncRenderedLayout(target, context, (nextLayout) => {
        currentLayout = nextLayout
        void renderWithData()
      })
      await hydrateQRCodes(target)
    }

    loadExtendedProfile(store, subject).then(async () => {
      await renderWithData()
    })

    return target
  },
}

export default Pane
