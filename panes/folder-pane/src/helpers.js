
import { utils } from 'solid-ui'

function isJavaScriptFile (resource) {
  return /\.[cm]?js$/i.test(new URL(resource.uri).pathname)
}

function isTurtleFile (resource) {
  return /\.ttl$/i.test(new URL(resource.uri).pathname)
}

function isJsonFile (resource) {
  return /\.json$/i.test(new URL(resource.uri).pathname)
}

function getResourceAccessState (access) {
  if (access.isPublicKnown === false) return 'unknown'
  return access.isPublic ? 'public' : 'private'
}

/**
 * Reads access from the WAC-Allow header of a stored response, so a resource
 * already loaded with GET does not need a separate HEAD.
 * Returns undefined when no stored header is available.
 */
function readStoredWacAllow (wacAllowValues) {
  const header = wacAllowValues?.filter(Boolean).join(',')
  if (!header) return undefined
  const modes = new Map()
  for (const entry of header.split(',')) {
    const match = entry.trim().match(/^([A-Za-z]+)\s*=\s*"([^"]*)"$/)
    if (match) modes.set(match[1].toLowerCase(), match[2].toLowerCase().split(/\s+/).filter(Boolean))
  }
  const publicModes = modes.get('public') ?? []
  return {
    isPublic: publicModes.includes('read') || publicModes.includes('write'),
    canManageAccess: (modes.get('user') ?? []).includes('control')
  }
}

function getCreationNoun (paneName) {
  if (paneName?.toLowerCase() === 'source') return 'file'
  return paneName || 'item'
}

function getPaneLabel (pane) {
  if (pane.mintClass) return utils.label(pane.mintClass)
  const noun = getCreationNoun(pane.name)
  return noun.charAt(0).toUpperCase() + noun.slice(1)
}

function getContainerMemberCountLabel (memberCount) {
  return `${memberCount} ${memberCount === 1 ? 'item' : 'items'}`
}

function getCreationPanes (panes) {
  // Keep pane-registry order: it is also the pane priority order.
  return panes.filter(pane => !!pane.mintNew && pane.name?.toLowerCase() !== 'chat')
}

function getCreationDialogText (paneLabel = 'Container') {
  const displayLabel = paneLabel.charAt(0).toUpperCase() + paneLabel.slice(1)
  return {
    title: `New ${displayLabel}`,
    placeholder: `Enter ${displayLabel} name`
  }
}

function isContainerResource (resource, resourceLogic) {
  return resource.uri.endsWith('/') ||
    (!isJavaScriptFile(resource) && !isTurtleFile(resource) && !isJsonFile(resource) && resourceLogic.isContainer(resource))
}

function isAccessDeniedError (error) {
  const response = typeof error === 'object' && error !== null
    ? error
    : undefined
  return response?.status === 401 || response?.status === 403 ||
    response?.response?.status === 401 || response?.response?.status === 403
}

/**
 * A pane's `index.ttl#this` stands for its container: return that container so
 * routing can render the pane without the file-explorer header.
 */
function getIndexedContainer (resource) {
  const match = /^(.*\/)index\.ttl#this$/.exec(resource.uri)
  return match ? match[1] : null
}

function getIndexedApplicationSubject (container, paneName) {
  return paneName?.toLowerCase() === 'schedule'
    ? `${container.uri}details.ttl#event`
    : `${container.uri}index.ttl#this`
}

function getResourcesForContainer (container, resourceLogic) {
  if (!resourceLogic) return new Map()

  const containedResources = resourceLogic.getContainerMembers(container).filter(
    (resource) => !resourceLogic.isHiddenFile(resource)
  ).filter((containedResource, index, allContainedResources) => {
    return allContainedResources.findIndex(other => other.sameTerm(containedResource)) === index
  }).filter((resource) => {
    const containerUri = container.uri.endsWith('/') ? container.uri : `${container.uri}/`
    return resource.uri !== `${containerUri}index.ttl#this`
  })
  const labeledResources = containedResources.map(containedResource => [
    utils.label(containedResource).toLowerCase(),
    containedResource
  ])
  labeledResources.sort()

  return new Map(labeledResources.map(([, resource]) => [resource.value, {
    id: resource.value,
    subject: resource,
    parentId: container.value,
    isContainer: isContainerResource(resource, resourceLogic)
  }]))
}

export {
  getCreationNoun,
  getCreationPanes,
  getCreationDialogText,
  getContainerMemberCountLabel,
  getIndexedApplicationSubject,
  getIndexedContainer,
  getPaneLabel,
  getResourceAccessState,
  getResourcesForContainer,
  isAccessDeniedError,
  isContainerResource,
  isJavaScriptFile,
  isTurtleFile,
  isJsonFile,
  readStoredWacAllow
}
