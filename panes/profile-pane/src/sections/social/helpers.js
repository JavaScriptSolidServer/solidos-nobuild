import { graph, LiveStore, NamedNode, parse, sym } from 'rdflib'
import { ns, utils } from 'solid-ui'
const socialMediaForm = await (await fetch(new URL('../../ontology/socialMedia.ttl', import.meta.url))).text()
import { starIcon } from '../../icons-svg/profileIcons.js'
import { loadDocument } from '../../rdfFormsHelper.js'
import { expandRdfList } from '../shared/rdfList.js'
import { DEFAULT_ICON_URI, socialMediaFormName } from './constants.js'
const discordIconAsset = new URL('../../../icons-png/discord.png', import.meta.url).href
const dribbbleIconAsset = new URL('../../../icons-png/dribbble.png', import.meta.url).href
const facebookIconAsset = new URL('../../../icons-png/facebook.png', import.meta.url).href
const instagramIconAsset = new URL('../../../icons-png/instagram.png', import.meta.url).href
const linkedinIconAsset = new URL('../../../icons-png/linkedin.png', import.meta.url).href
const pinterestIconAsset = new URL('../../../icons-png/pinterest.png', import.meta.url).href
const sharechatIconAsset = new URL('../../../icons-png/sharechat.png', import.meta.url).href
const snapchatIconAsset = new URL('../../../icons-png/snapchat.png', import.meta.url).href
const spotifyIconAsset = new URL('../../../icons-png/spotify.png', import.meta.url).href
const telegramIconAsset = new URL('../../../icons-png/telegram.png', import.meta.url).href
const tiktokIconAsset = new URL('../../../icons-png/tiktok.png', import.meta.url).href
const whatsappIconAsset = new URL('../../../icons-png/whatsapp.png', import.meta.url).href
const xIconAsset = new URL('../../../icons-png/x.png', import.meta.url).href
const youtubeIconAsset = new URL('../../../icons-png/youtube.png', import.meta.url).href

const OWL_DISJOINT_UNION_OF = sym('http://www.w3.org/2002/07/owl#disjointUnionOf')
const STAR_ICON_REF = 'urn:profile-pane:starIcon'
const ICON_KEY_REF_PREFIX = 'urn:profile-pane:icon:'
const SOCIAL_ONTOLOGY_URI = 'https://solidos.github.io/profile-pane/src/ontology/socialMedia.ttl'
const SOCIAL_CLASS_BASE = `${SOCIAL_ONTOLOGY_URI}#`

const STAR_ICON_URI = (() => {
  const svgMarkup = (starIcon)?.strings?.join('') || ''
  return svgMarkup ? `data:image/svg+xml;utf8,${encodeURIComponent(svgMarkup)}` : DEFAULT_ICON_URI
})()

let cachedSocialOntologyStore = null

const FALLBACK_SOCIAL_OPTIONS = [
  { classUri: `${SOCIAL_CLASS_BASE}FacebookAccount`, label: 'Facebook', icon: facebookIconAsset, userProfilePrefix: 'https://www.facebook.com/', homepage: 'https://www.facebook.com/' },
  { classUri: `${SOCIAL_CLASS_BASE}InstagramAccount`, label: 'Instagram', icon: instagramIconAsset, userProfilePrefix: 'https://www.instagram.com/', homepage: 'https://www.instagram.com/' },
  { classUri: `${SOCIAL_CLASS_BASE}LinkedInAccount`, label: 'LinkedIn', icon: linkedinIconAsset, userProfilePrefix: 'https://www.linkedin.com/in/', homepage: 'https://linkedin.com/' },
  { classUri: `${SOCIAL_CLASS_BASE}TiktokAccount`, label: 'TikTok', icon: tiktokIconAsset, userProfilePrefix: 'https://www.tiktok.com/@', homepage: 'https://www.tiktok.com/' },
  { classUri: `${SOCIAL_CLASS_BASE}TwitterAccount`, label: 'X', icon: xIconAsset, userProfilePrefix: 'https://x.com/', homepage: 'https://x.com/' },
  { classUri: `${SOCIAL_CLASS_BASE}YouTubeAccount`, label: 'YouTube', icon: youtubeIconAsset, userProfilePrefix: 'https://www.youtube.com/', homepage: 'https://www.youtube.com/' },
  { classUri: `${SOCIAL_CLASS_BASE}DiscordAccount`, label: 'Discord', icon: discordIconAsset, userProfilePrefix: 'https://discord.com/users/', homepage: 'https://discord.com/' },
  { classUri: `${SOCIAL_CLASS_BASE}SnapchatAccount`, label: 'Snapchat', icon: snapchatIconAsset, userProfilePrefix: 'https://www.snapchat.com/add/', homepage: 'https://www.snapchat.com/' },
  { classUri: `${SOCIAL_CLASS_BASE}PinterestAccount`, label: 'Pinterest', icon: pinterestIconAsset, userProfilePrefix: 'https://pin.it/', homepage: 'https://pinterest.com/' },
  { classUri: `${SOCIAL_CLASS_BASE}SpotifyAccount`, label: 'Spotify', icon: spotifyIconAsset, userProfilePrefix: 'https://www.spotify.com/user/', homepage: 'https://www.spotify.com/' },
  { classUri: `${SOCIAL_CLASS_BASE}TelegramAccount`, label: 'Telegram', icon: telegramIconAsset, userProfilePrefix: 'https://t.me/', homepage: 'https://telegram.org/' },
  { classUri: `${SOCIAL_CLASS_BASE}DribbleAccount`, label: 'Dribble', icon: dribbbleIconAsset, userProfilePrefix: 'https://dribbble.com/', homepage: 'https://dribbble.com/' },
  { classUri: `${SOCIAL_CLASS_BASE}SharechatAccount`, label: 'ShareChat', icon: sharechatIconAsset, userProfilePrefix: 'https://www.sharechat.com/user/', homepage: 'https://sharechat.com/' },
  { classUri: `${SOCIAL_CLASS_BASE}WhatsAppAccount`, label: 'WhatsApp', icon: whatsappIconAsset, userProfilePrefix: 'https://wa.me/', homepage: 'https://www.whatsapp.com/' }
]

// Temporary icon mapping for locally bundled social PNG assets.
// These icon assets are intended to move to a dedicated icons project later.
const ONTOLOGY_ICON_ASSETS = {
  // New key-based references used in socialMedia.ttl.
  'discord': discordIconAsset,
  'dribbble': dribbbleIconAsset,
  'facebook': facebookIconAsset,
  'instagram': instagramIconAsset,
  'linkedin': linkedinIconAsset,
  'pinterest': pinterestIconAsset,
  'sharechat': sharechatIconAsset,
  'snapchat': snapchatIconAsset,
  'spotify': spotifyIconAsset,
  'telegram': telegramIconAsset,
  'tiktok': tiktokIconAsset,
  'whatsapp': whatsappIconAsset,
  'x': xIconAsset,
  'youtube': youtubeIconAsset,
  // Backward compatibility for older path-based ontology values.
  'discord.png': discordIconAsset,
  'dribbble.png': dribbbleIconAsset,
  'facebook.png': facebookIconAsset,
  'instagram.png': instagramIconAsset,
  'linkedin.png': linkedinIconAsset,
  'pinterest.png': pinterestIconAsset,
  'sharechat.png': sharechatIconAsset,
  'snapchat.png': snapchatIconAsset,
  'spotify.png': spotifyIconAsset,
  'telegram.png': telegramIconAsset,
  'tiktok.png': tiktokIconAsset,
  'whatsapp.png': whatsappIconAsset,
  'x.png': xIconAsset,
  'youtube.png': youtubeIconAsset
}

function resolveBundledIconAsset(iconValue) {
  if (!iconValue) return ''
  const normalized = iconValue.trim().toLowerCase()

  if (normalized.startsWith(ICON_KEY_REF_PREFIX)) {
    const key = normalized.slice(ICON_KEY_REF_PREFIX.length)
    return ONTOLOGY_ICON_ASSETS[key] || ''
  }

  const marker = 'icons-png/'
  const markerIndex = normalized.lastIndexOf(marker)
  if (markerIndex === -1) return ''

  const fileName = normalized.slice(markerIndex + marker.length)
  return ONTOLOGY_ICON_ASSETS[fileName] || ''
}

function resolveSocialIcon(classUri, iconValue) {
  if (classUri.endsWith('#OtherAccount') || iconValue === STAR_ICON_REF) {
    return STAR_ICON_URI
  }
  const bundledIcon = resolveBundledIconAsset(iconValue)
  if (bundledIcon) return bundledIcon
  return iconValue || DEFAULT_ICON_URI
}

function getSocialOntologyStore() {
  if (cachedSocialOntologyStore) return cachedSocialOntologyStore

  const ontologyStore = graph()
  parse(socialMediaForm, ontologyStore, SOCIAL_ONTOLOGY_URI, 'text/turtle', () => null)
  cachedSocialOntologyStore = ontologyStore
  return ontologyStore
}

function normalizeSocialOptionKey(value) {
  return (value || '')
    .trim()
    .toLowerCase()
    .replace(/[#:/]/g, ' ')
    .replace(/account\b/g, '')
    .replace(/[^a-z0-9]/g, '')
}

export function findSocialAccountOption(options, value) {
  const rawValue = (value || '').trim()
  if (!rawValue) return undefined

  const lowerValue = rawValue.toLowerCase()
  const direct = options.find((option) => {
    return option.classUri.toLowerCase() === lowerValue || option.label.toLowerCase() === lowerValue
  })
  if (direct) return direct

  const key = normalizeSocialOptionKey(rawValue)
  if (!key) return undefined

  return options.find((option) => {
    const optionLabelKey = normalizeSocialOptionKey(option.label)
    const optionClassKey = normalizeSocialOptionKey(option.classUri)
    return optionLabelKey === key || optionClassKey === key
  })
}

export function ensureSocialOntologyLoaded(store) {
  loadDocument(store, socialMediaForm, socialMediaFormName)
}

export function getSocialAccountOptions(store) {
  ensureSocialOntologyLoaded(store)
  const ontologyStore = getSocialOntologyStore()

  const classNodeMap = new Map()

  const unionNode = ontologyStore.any(ns.foaf('Account'), OWL_DISJOINT_UNION_OF)
  if (unionNode) {
    const unionClassNodes = expandRdfList(ontologyStore, unionNode)
      .filter((node) => node.termType === 'NamedNode')
    for (const classNode of unionClassNodes) {
      classNodeMap.set(classNode.value, classNode)
    }
  }

  // Fallback/augmentation: include any class declared as a foaf:Account subclass.
  const subclassStatements = ontologyStore.statementsMatching(undefined, ns.rdfs('subClassOf'), ns.foaf('Account'))
  for (const statement of subclassStatements) {
    const classNode = statement.subject
    if (classNode?.termType === 'NamedNode') {
      classNodeMap.set(classNode.value, classNode)
    }
  }

  const classNodes = Array.from(classNodeMap.values())
  if (!classNodes.length) return []

  const options = classNodes.map((classNode) => {
    const label =
      ontologyStore.any(classNode, ns.rdfs('label'))?.value ||
      utils.label(classNode) ||
      classNode.value

    const iconValue = ontologyStore.any(classNode, ns.foaf('icon'))?.value || ''
    const icon = resolveSocialIcon(classNode.value, iconValue)
    const homepage = ontologyStore.any(classNode, ns.foaf('homepage'))?.value || ''
    const userProfilePrefix = ontologyStore.any(classNode, ns.foaf('userProfilePrefix'))?.value || ''

    return {
      classUri: classNode.value,
      label,
      icon,
      homepage: homepage || undefined,
      userProfilePrefix: userProfilePrefix || undefined
    }
  })

  // Keep labels stable and avoid duplicates if ontology data repeats.
  const seen = new Set()
  const normalizedOptions = options.filter((option) => {
    const key = option.label.toLowerCase().trim()
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })

  for (const fallbackOption of FALLBACK_SOCIAL_OPTIONS) {
    const key = fallbackOption.label.toLowerCase().trim()
    if (!seen.has(key)) {
      normalizedOptions.push(fallbackOption)
      seen.add(key)
    }
  }

  return normalizedOptions
}

export function nameForAccount(store, accountNode) {
  const accountName = store.any(accountNode, ns.foaf('name')) || store.any(accountNode, ns.rdfs('label'))
  if (accountName) return accountName.value

  const classes = store.each(accountNode, ns.rdf('type'))
  for (const classNode of classes) {
    const classLabel = store.any(classNode, ns.rdfs('label'))
    if (classLabel) return classLabel.value
    return utils.label(classNode)
  }

  return 'Unknown Account'
}

export function iconForAccount(store, accountNode) {
  const accountIcon = store.any(accountNode, ns.foaf('icon'))
  if (accountIcon?.value === STAR_ICON_REF) return STAR_ICON_URI
  if (accountIcon) {
    const bundledIcon = resolveBundledIconAsset(accountIcon.value)
    if (bundledIcon) return bundledIcon
    return accountIcon.value
  }

  const classes = store.each(accountNode, ns.rdf('type'))
  for (const classNode of classes) {
    if (classNode?.value?.endsWith('#OtherAccount')) return STAR_ICON_URI
    const classIcon = store.any(classNode, ns.foaf('icon'))
    if (classIcon?.value === STAR_ICON_REF) return STAR_ICON_URI
    if (classIcon) {
      const bundledIcon = resolveBundledIconAsset(classIcon.value)
      if (bundledIcon) return bundledIcon
      return classIcon.value
    }
  }

  return DEFAULT_ICON_URI
}

export function homepageForAccount(store, accountNode) {
  const accountHomepage = store.any(accountNode, ns.foaf('homepage'))
  if (accountHomepage) return accountHomepage.value

  const id = String(store.anyJS(accountNode, ns.foaf('accountName'), null, accountNode.doc()) || 'No_account_Name').trim()
  if (/^https?:\/\//i.test(id)) return id

  const classes = store.each(accountNode, ns.rdf('type'))

  for (const classNode of classes) {
    if (classNode.termType === 'NamedNode') {
      const userProfilePrefix = store.any(classNode, ns.foaf('userProfilePrefix'))
      if (userProfilePrefix) {
        return userProfilePrefix.value + String(id).trim()
      }
    }
  }

  return store.anyJS(accountNode, ns.foaf('homepage'), null, accountNode.doc()) || ''
}
