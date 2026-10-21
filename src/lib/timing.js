export function generateId () {
  return Math.random().toString(36).substring(2, 15)
}

/**
 * @template {any[]} Args
 * @param {number} delay
 * @param {(...args: Args) => unknown} callback
 */
export function debounce (delay, callback) {
  let timeout = null

  const debouncedCallback = (...args) => {
    debouncedCallback.cancel()
    timeout = setTimeout(() => callback(...args), delay)
  }

  debouncedCallback.cancel = () => {
    if (timeout === null) return

    clearTimeout(timeout)
    timeout = null
  }

  return debouncedCallback
}
