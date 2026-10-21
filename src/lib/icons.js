// Replaces unplugin-icons' `~icons/<set>/<name>` virtual modules, which compile
// each icon to a custom element named `icon-<set>-<name>`. Same tag names here,
// so component CSS and markup stay unchanged.

import { define } from './define.js'

export function defineIcon (tagName, svg) {
  return define(tagName, class extends HTMLElement {
    connectedCallback () {
      if (this.shadowRoot) return

      const root = this.attachShadow({ mode: 'open' })

      // Same as solidos-toolkit's unplugin-icons compiler: the host is inline-flex and
      // the svg fills it (width/height 100%), so CSS on the icon element sets the size.
      root.innerHTML = `<style>:host { display: inline-flex; }</style>${svg.replace('<svg ', '<svg width="100%" height="100%" ')}`
    }
  })
}

// Bodies from Iconify (svg-spinners: MIT, lucide: ISC); app/* from upstream src/assets/icons.
defineIcon('icon-svg-spinners-180-ring', '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="currentColor" d="M12,4a8,8,0,0,1,7.89,6.7A1.53,1.53,0,0,0,21.38,12h0a1.5,1.5,0,0,0,1.48-1.75,11,11,0,0,0-21.72,0A1.5,1.5,0,0,0,2.62,12h0a1.53,1.53,0,0,0,1.49-1.3A8,8,0,0,1,12,4Z"><animateTransform attributeName="transform" dur="0.75s" repeatCount="indefinite" type="rotate" values="0 12 12;360 12 12"/></path></svg>')
defineIcon('icon-lucide-circle-user', '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="10" r="3"/><path d="M7 20.662V19a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1.662"/></g></svg>')
defineIcon('icon-lucide-user', '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></g></svg>')
defineIcon('icon-lucide-log-in', '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m10 17l5-5l-5-5m5 5H3m12-9h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/></svg>')
defineIcon('icon-lucide-log-out', '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m16 17l5-5l-5-5m5 5H9m0 9H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/></svg>')
defineIcon('icon-lucide-chevron-down', '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m6 9l6 6l6-6"/></svg>')
defineIcon('icon-svg-spinners-3-dots-fade', '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="4" cy="12" r="3" fill="currentColor"><animate id="SVG7x14Dcom" fill="freeze" attributeName="opacity" begin="0;SVGqSjG0dUp.end-0.25s" dur="0.75s" values="1;.2"/></circle><circle cx="12" cy="12" r="3" fill="currentColor" opacity=".4"><animate fill="freeze" attributeName="opacity" begin="SVG7x14Dcom.begin+0.15s" dur="0.75s" values="1;.2"/></circle><circle cx="20" cy="12" r="3" fill="currentColor" opacity=".3"><animate id="SVGqSjG0dUp" fill="freeze" attributeName="opacity" begin="SVG7x14Dcom.begin+0.3s" dur="0.75s" values="1;.2"/></circle></svg>')
defineIcon('icon-lucide-x', '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 6L6 18M6 6l12 12"/></svg>')
defineIcon('icon-app-solid-emblem', '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 352 322"><g fill="none"><path fill="#fff" d="m87.973 282.353-60.732-105.33a31.6 31.6 0 0 1 0-31.538L87.973 40.233c5.646-9.784 16.08-15.795 27.321-15.795H236.68c11.266 0 21.727 6.011 27.321 15.795l60.758 105.304a31.6 31.6 0 0 1 0 31.537l-60.732 105.33c-5.646 9.784-16.08 15.795-27.321 15.795H115.372a31.85 31.85 0 0 1-27.4-15.846"/><path fill="#7c4dff" d="m93.151 275.197-57.115-99.06c-5.308-9.185-5.308-20.504 0-29.663l57.115-99.086a29.74 29.74 0 0 1 25.734-14.857h114.23c10.59 0 20.426 5.646 25.734 14.857l57.167 99.034c5.308 9.185 5.308 20.504 0 29.663l-57.141 99.138a29.74 29.74 0 0 1-25.734 14.858H118.937a29.79 29.79 0 0 1-25.786-14.884"/><path fill="#f7f7f7" d="M118.469 142.233h117.534a2.65 2.65 0 0 0 2.654-2.654v-22.04c0-14.65-11.891-26.54-26.54-26.54h-70.568c-20.53-.026-37.157 16.6-37.157 37.13-.026 7.833 6.27 14.104 14.077 14.104m11.527 97.368h70.229c21.207 0 38.432-17.225 38.432-38.432 0-7.078-5.724-12.828-12.828-12.828H106.942a2.537 2.537 0 0 0-2.55 2.55v23.054c-.026 14.181 11.475 25.656 25.604 25.656"/><path fill="#f7f7f7" d="m109.596 139.319 87.663 87.662c5.802 5.803 15.196 5.803 20.998 0l15.196-15.196c5.803-5.802 5.803-15.196 0-20.998l-87.637-87.663c-5.802-5.802-15.196-5.802-20.998 0l-15.196 15.196c-5.855 5.803-5.855 15.222-.026 20.999"/><path fill="#444" d="m198.69 228.464-51.495-40.123h11.397zm-54.33-126.797 40.565 40.566h13.765z" opacity=".3"/></g></svg>')
