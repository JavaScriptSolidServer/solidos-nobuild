

export function clearFailedResource (fetcher, resource) {
  if (fetcher.getState(resource.value) !== 'failed') return false
  fetcher.unload(resource)
  return true
}
