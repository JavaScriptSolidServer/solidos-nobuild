import { ContextConsumer, ContextProvider } from '@lit/context'

/**
 * Replaces `@consume({ context, subscribe: true }) accessor <prop> = fallback`.
 * Call from the constructor. Like the decorator, the value arrives during
 * super.connectedCallback(), so `host[prop]` is set by the time it returns.
 */
export function consume (host, prop, context, fallback) {
  host[prop] = fallback

  return new ContextConsumer(host, {
    context,
    subscribe: true,
    callback: (value) => {
      host[prop] = value
      host.requestUpdate()
    },
  })
}

/**
 * Replaces `@provide({ context }) accessor <prop> = initialValue`.
 * Returns the provider; call `.setValue()` on it to publish a new value.
 */
export function provide (host, context, initialValue) {
  return new ContextProvider(host, { context, initialValue })
}
