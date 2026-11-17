

export function invalidateRenderRequest (generation) {
  return generation + 1
}

export function isCurrentRenderRequest (
  request,
  generation,
  subjectUri,
  context
) {
  return request.generation === generation &&
    request.subjectUri === subjectUri &&
    request.context === context
}
