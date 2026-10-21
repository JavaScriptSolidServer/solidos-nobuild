import { html, nothing } from 'lit-html'
import 'solid-ui/components/button'
// (type-only import removed: Layout from '../types.js')

export function renderResponsiveActionButton({
  layout = 'desktop',
  className,
  ariaLabel,
  variant = {
    desktop: 'tertiary',
    mobile: 'ghost'
  },
  onClick,
  desktopIcon = nothing,
  desktopLabel,
  mobileIcon = nothing
}) {
  return html`
    <solid-ui-button
      variant=${layout === 'desktop' ? variant.desktop : variant.mobile}
      class=${className}
      aria-label=${ariaLabel}
      @click=${onClick}
    >
      ${layout === 'desktop' ? desktopIcon : nothing}
      ${layout === 'desktop' && desktopLabel ? html`<span class="profile-section-collapsible__action-label">${desktopLabel}</span>` : nothing}
      ${layout === 'mobile' ? mobileIcon : nothing}
    </solid-ui-button>
  `
}
