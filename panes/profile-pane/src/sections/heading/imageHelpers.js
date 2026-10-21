import { LiveStore, NamedNode, sym } from 'rdflib'
import { ns } from 'solid-ui'
import { authn, solidLogicSingleton } from 'solid-logic'
import { error as debugError } from '../../utils/debug.js'

const resolvedHeadingImageCache = new Map()

export function invalidateResolvedPhotoDisplaySrc(imageSrc) {
  if (!imageSrc) return

  const cachedImageSrc = resolvedHeadingImageCache.get(imageSrc)
  if (!cachedImageSrc) return

  resolvedHeadingImageCache.delete(imageSrc)
  if (cachedImageSrc.startsWith('blob:') && typeof URL.revokeObjectURL === 'function') {
    URL.revokeObjectURL(cachedImageSrc)
  }
}
/* Code copied from contact-pane/src/mugshotGallery and modified to fit the needs of the new design */
const mimeMap = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/gif': 'gif',
  'image/svg+xml': 'svg',
  'image/webp': 'webp',
  'image/bmp': 'bmp',
  'image/tiff': 'tiff',
  'application/pdf': 'pdf',
  'text/plain': 'txt',
  'text/html': 'html',
  'application/json': 'json',
  'application/octet-stream': 'bin'
}

const extMap = Object.fromEntries(
  Object.entries(mimeMap).map(([contentType, extension]) => [extension, contentType])
)

const mime = {
  extension: (contentType) => mimeMap[contentType] || false,
  lookup: (filename) => {
    const ext = filename.split('.').pop()?.toLowerCase() || ''
    return extMap[ext] || false
  }
}

function subjectDirectoryUri(subject) {
  const docUri = subject.doc().uri
  const lastSlash = docUri.lastIndexOf('/')
  return lastSlash >= 0 ? docUri.slice(0, lastSlash + 1) : docUri
}

export async function resolvePhotoDisplaySrc(store, imageSrc) {
  if (!imageSrc || imageSrc.startsWith('blob:') || imageSrc.startsWith('data:')) {
    return imageSrc
  }

  const cachedImageSrc = resolvedHeadingImageCache.get(imageSrc)
  if (cachedImageSrc) {
    return cachedImageSrc
  }

  const fetcher = store.fetcher
  if (!fetcher?._fetch || typeof URL.createObjectURL !== 'function') {
    return imageSrc
  }

  try {
    const response = await fetcher._fetch(imageSrc)
    if (!response.ok) {
      return imageSrc
    }

    const imageBlob = await response.blob()
    const resolvedImageSrc = URL.createObjectURL(imageBlob)
    resolvedHeadingImageCache.set(imageSrc, resolvedImageSrc)
    return resolvedImageSrc
  } catch {
    return imageSrc
  }
}

export async function uploadPhotoFile(store, subject, file) {
  if (!store.fetcher) {
    throw new Error('Store has no fetcher.')
  }

  const detectedContentType = file.type || mime.lookup(file.name) || 'application/octet-stream'
  if (!detectedContentType.startsWith('image/')) {
    throw new Error('Selected file is not an image.')
  }

  const extension = mime.extension(detectedContentType) || 'bin'
  let filename = encodeURIComponent(file.name || `image.${extension}`)

  if (detectedContentType !== mime.lookup(file.name || '')) {
    filename += `_.${extension}`
  }

  const directoryUri = subjectDirectoryUri(subject)
  let candidateUri = `${directoryUri}${filename}`

  for (let index = 0; store.holds(subject, ns.vcard('hasPhoto'), sym(candidateUri)); index++) {
    const fallbackName = `image_${index}.${extension}`
    candidateUri = `${directoryUri}${fallbackName}`
  }
  try {
    const data = await file.arrayBuffer()
    const response = await store.fetcher.webOperation('PUT', candidateUri, {
      data: data,
      contentType: detectedContentType
    })
    if (!response.ok) {
      throw new Error(`Error uploading picture: ${response.status} ${response.statusText}`)
    }
  } catch (error) {
    throw new Error(`Error uploading picture: ${error}`)
  }

  const currentUser = authn.currentUser()
  if (currentUser) {
    try {
      await solidLogicSingleton.acl.setACLUserPublic(candidateUri, currentUser, {
        public: ['Read']
      })
    } catch (error) {
      debugError(`Error setting uploaded picture permissions: ${error}`)
    }
  }

  return candidateUri
}
