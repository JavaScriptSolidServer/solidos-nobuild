export function noopContext (name) {
  const fail = () => { throw new Error(`Context '${name}' is missing. Is the component inside its provider?`) }

  return new Proxy({}, {
    get: fail,
    set: fail,
    has: fail,
    ownKeys: fail,
    getOwnPropertyDescriptor: fail,
    defineProperty: fail,
    deleteProperty: fail
  })
}
