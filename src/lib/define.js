// Replaces the @customElement decorator. Skips duplicate registrations,
// as upstream does (see SolidOS/solidos#300).

export function define (tagName, elementClass) {
  if (!customElements.get(tagName)) {
    customElements.define(tagName, elementClass)
  }

  return elementClass
}

/** Upstream's `@customElement(tag)` decorator, callable as a plain function: customElement(tag)(Class). */
export function customElement (tagName) {
  return (elementClass) => define(tagName, elementClass)
}
