import { loadSheet } from '../../lib/css.js'
import { DialogComponent } from '../../lib/dialogs.js'
import { html } from 'lit'

import { label } from '../../utils/label.js'
import * as debug from '../../lib/debug.js'
import { Authenticated, Public, analyzeContainerAccessScope, filterAuthorizationsByContainerScope, solidLogicSingleton,} from 'solid-logic'
import { sym } from 'rdflib'

import '../../lib/icons.js'
import '../dialog/index.js'
import '../dialog-content/index.js'
import '../dialog-footer/index.js'
import '../button/index.js'
import '../combobox/index.js'
import '../combobox-option/index.js'
import './AccessControlSharedAccess.js'
import './AccessControlGeneralAccess.js'
import './AccessControlErrors.js'

const styles = await loadSheet(new URL('./AccessControlModal.styles.css', import.meta.url))

import { createAccessGrantDrafts, getAccessGrantIds, getAccessGrantViewModels, getAuthenticatedAccessRole, getAuthorizationSubjectLabel, getChangedAccessGrants, getPublicAccessRole, getSharedAuthorization } from './accessGrantDrafts.js'
import { accessPrincipalOptionsProvider, resolveAccessTarget } from './accessTargetResolver.js'
import { applyAccessChanges } from './applyAccessChanges.js'
import { buildAccessChanges } from './buildAccessChanges.js'

function isDefined (value) {
  return value !== undefined && value !== null
}

export default class AccessControlModal extends DialogComponent {
  static properties = {
    subjectUri: { attribute: false },
    accessGrants: { attribute: false },
    principalInputValue: { state: true },
    addAccessRoleValue: { state: true },
    authenticatedAccessRoleValue: { state: true },
    publicAccessRoleValue: { state: true },
    submitting: { state: true },
    pendingAccessGrants: { state: true },
    accessGrantDrafts: { state: true },
    errors: { state: true },
    successfulChangesRefreshed: { state: true },
    accessContext: { state: true },
    accessContextLoading: { state: true },
    accessContextError: { state: true },
    advancedSharingOpen: { state: true },
    containerScope: { state: true },
    containerScopeAnalysis: { state: true },
    protectedTarget: { state: true },
  }

  constructor () {
    super()
    this.subjectUri = undefined
    this.accessGrants = undefined
    this.principalInputValue = ''
    this.addAccessRoleValue = 'Viewer'
    this.authenticatedAccessRoleValue = 'No Access'
    this.publicAccessRoleValue = 'No Access'
    this.submitting = false
    this.pendingAccessGrants = []
    this.accessGrantDrafts = []
    this.errors = []
    this.successfulChangesRefreshed = true
    this.accessContextLoading = false
    this.accessContextError = ''
    this.advancedSharingOpen = false
    this.containerScope = 'folder+contents'
    this.protectedTarget = false
  }

  static styles = styles

  // Intentionally has no opener this release: scope selectors and reset are deferred.

  accessGrantLabelRequestVersion = 0
  accessContextRequestVersion = 0
  accessContextSubjectUri

  disconnectedCallback () {
    this.accessGrantLabelRequestVersion++
    this.accessContextRequestVersion++
    this.errors = []
    super.disconnectedCallback()
  }

  get inputError () {
    return this.errors.find(error => error.action === 'input')?.message ?? ''
  }

  get saveErrors () {
    return this.errors.filter((error) => error.action !== 'input')
  }

  setInputError (error) {
    this.errors = [
      ...this.errors.filter(item => item.action !== 'input'),
      error
    ]
  }

  clearInputError () {
    this.errors = this.errors.filter(error => error.action !== 'input')
  }

  willUpdate (changedProperties) {
    super.willUpdate(changedProperties)

    if (changedProperties.has('accessGrants')) {
      const scopedAccessGrants = this.getScopedAccessGrants()
      this.accessGrantDrafts = createAccessGrantDrafts(scopedAccessGrants)
      this.authenticatedAccessRoleValue = getAuthenticatedAccessRole(scopedAccessGrants)
      this.publicAccessRoleValue = getPublicAccessRole(scopedAccessGrants)
    }
  }

  updated (changedProperties) {
    super.updated(changedProperties)

    if (changedProperties.has('subjectUri')) {
      this.loadAccessContext().catch(error => {
        debug.error('Failed to load access control context', error)
      })
    }

    if (changedProperties.has('accessGrants')) {
      this.refreshAccessGrantLabels().catch((error) => {
        debug.error('Failed to refresh access grant labels', error)
      })
    }

    if (changedProperties.has('accessContext') && !changedProperties.has('subjectUri')) {
      this.refreshContainerScopeAnalysis()
    }
  }

  refreshContainerScopeAnalysis () {
    if (this.isContainer() && this.accessContext) {
      this.containerScopeAnalysis = analyzeContainerAccessScope(this.accessContext)
      this.containerScope = this.containerScopeAnalysis.primaryScope
      this.refreshScopedAccessGrantDrafts()
    } else {
      this.containerScopeAnalysis = undefined
    }
  }

  async refreshAccessGrantLabels () {
    const requestVersion = ++this.accessGrantLabelRequestVersion
    const sourceAccessGrants = this.accessGrants
    const subjectUri = this.subjectUri
    const scope = this.getSelectedContainerScope()
    const grants = this.getScopedAccessGrants(scope)
    if (!grants.length) {
      this.accessGrantDrafts = []
      return
    }

    const labels = await Promise.all(grants.map(async authorization => {
      await Promise.all(authorization.agentGroup.map(async groupUri => {
        try {
          await solidLogicSingleton.store.fetcher.load(sym(groupUri).doc())
        } catch {
          // Keep the fallback label if the group document cannot be loaded.
        }
      }))

      return getAuthorizationSubjectLabel(getSharedAuthorization(authorization))
    }))

    if (
      requestVersion === this.accessGrantLabelRequestVersion &&
      this.accessGrants === sourceAccessGrants &&
      this.subjectUri === subjectUri &&
      this.getSelectedContainerScope() === scope
    ) {
      const labelsById = new Map(getAccessGrantIds(grants).map((id, index) => [id, labels[index]]))
      this.accessGrantDrafts = this.accessGrantDrafts.map(draft => ({
        ...draft,
        subjectLabel: labelsById.get(draft.id) ?? draft.subjectLabel
      }))
    }
  }

  getDialogTitle () {
    const subject = this.subjectUri ? sym(this.subjectUri) : undefined
    const subjectLabel = subject ? label(subject).trim() : ''

    if (!subjectLabel || subjectLabel === 'this resource') {
      return 'Manage Access of "this resource"'
    }
    return `Manage Access of "${subjectLabel}"`
  }

  isContainer () {
    return Boolean(this.subjectUri && new URL(this.subjectUri).pathname.endsWith('/'))
  }

  async loadAccessContext () {
    const requestVersion = ++this.accessContextRequestVersion
    const subjectUri = this.subjectUri
    this.accessContext = undefined
    this.accessContextSubjectUri = undefined
    this.accessContextError = ''
    this.accessContextLoading = Boolean(subjectUri)

    if (!subjectUri) {
      this.accessContextLoading = false
      return
    }

    try {
      const accessContext = await solidLogicSingleton.acl.findEffectiveAcl(subjectUri)
      if (requestVersion !== this.accessContextRequestVersion || this.subjectUri !== subjectUri) {
        return
      }

      this.accessContext = accessContext
      this.accessContextSubjectUri = subjectUri
      if (this.accessContext?.inherited && !(this.accessGrants?.length)) {
        // findAccessGrants only reports ACLs attached directly to the resource.
        // Inherited permissions are the effective grants users need to review.
        this.accessGrants = this.accessContext.authorizations
      }
      this.refreshContainerScopeAnalysis()
      this.protectedTarget = solidLogicSingleton.acl.isProtectedResource(subjectUri)
      if (this.protectedTarget) {
        this.refreshScopedAccessGrantDrafts()
      }
    } catch (error) {
      if (requestVersion !== this.accessContextRequestVersion || this.subjectUri !== subjectUri) {
        return
      }

      this.accessContextError = error instanceof Error && error.message.trim()
        ? error.message
        : 'Unable to load access settings for this resource.'
      debug.error('Failed to load access control context', error)
    } finally {
      if (requestVersion === this.accessContextRequestVersion && this.subjectUri === subjectUri) {
        this.accessContextLoading = false
      }
    }
  }

  async ensureAccessContext () {
    if (!this.subjectUri) {
      return false
    }

    // Direct method calls are used by consumers and unit tests before the
    // element is connected; the rendered controls are always guarded below.
    if (!this.isConnected) {
      return true
    }

    if (this.accessContextSubjectUri === this.subjectUri && this.accessContext && !this.accessContextError) {
      return true
    }

    await this.loadAccessContext()
    return this.accessContextSubjectUri === this.subjectUri && Boolean(this.accessContext) && !this.accessContextError
  }

  canMutate () {
    if (!this.isConnected) {
      return true
    }

    if (!this.subjectUri) {
      return true
    }

    return Boolean(
      this.subjectUri &&
      this.accessContextSubjectUri === this.subjectUri &&
      this.accessContext &&
      !this.accessContextLoading &&
      !this.accessContextError
    )
  }

  async retryAccessContext () {
    await this.loadAccessContext()
  }

  renderSharingInformation () {
    if (!this.accessContext) {
      return html``
    }

    const isCustomSharing = !this.accessContext.inherited
    const inheritedContainer = this.accessContext?.effectiveContainer
    const inheritedContainerLabel = inheritedContainer
      ? label(sym(inheritedContainer)).trim()
      : ''
    const defaultContainer = inheritedContainerLabel && inheritedContainerLabel !== inheritedContainer
      ? html`<strong>${inheritedContainerLabel}</strong> (${inheritedContainer})`
      : html`<strong>${inheritedContainer ?? 'the parent container'}</strong>`
    return html`
      <div class="access-control-sharing-state-panel">
        ${isCustomSharing
          ? html`
            <div class="access-control-sharing-state-custom-row">
              <p>This resource has its own sharing settings.</p>
              ${!this.protectedTarget
                ? html`
                  <solid-ui-button
                    type="button"
                    variant="tertiary"
                    aria-label="Reset custom sharing to default"
                    @click=${this.onResetToDefault}
                  >
                    Reset to default
                  </solid-ui-button>
                `
                : html``}
            </div>
          `
          : inheritedContainer
            ? html`<p>This resource inherits sharing settings from ${defaultContainer}.</p>`
            : html`<p>This resource inherits sharing settings, but no inherited default is available.</p>`}
        ${this.protectedTarget
          ? html`<p class="access-control-sharing-state-protected-message">This is a protected storage resource. Its primary access-control settings cannot be reset here.</p>`
          : html``}
      </div>
    `
  }

  renderSharingState () {
    if (!this.accessContext || !this.advancedSharingOpen) {
      return html``
    }

    return html`
      <section
        class="access-control-sharing-state"
        aria-labelledby="access-control-advanced-sharing-heading"
      >
        ${this.renderSharingInformation()}
        ${this.renderAdvancedSharing()}
      </section>
    `
  }

  getSelectedContainerScope () {
    return this.containerScope
  }

  hasMixedContainerPolicy () {
    return this.isContainer() && this.containerScopeAnalysis?.mixed === true
  }

  renderAccessContextState () {
    if (this.accessContextLoading) {
      return html`<p role="status">Loading access settings...</p>`
    }

    if (this.accessContextError) {
      return html`
        <solid-ui-error-state
          title="Could not load access settings"
          message=${this.accessContextError}
        >
          <solid-ui-button type="button" variant="secondary" @click=${this.retryAccessContext}>
            Retry
          </solid-ui-button>
        </solid-ui-error-state>
      `
    }

    if (!this.accessContext) {
      return html`<p role="status">Access settings are not ready yet.</p>`
    }

    return html``
  }

  renderMixedContainerWarning () {
    if (!this.hasMixedContainerPolicy()) {
      return html``
    }

    return html`
      <div class="access-control-mixed-policy-warning" role="alert">
        <strong>This container has different access settings for the folder and its contents.</strong>
        <span>Changing this mixed policy is an advanced feature. You can still change access for the folder or its contents separately below.</span>
      </div>
    `
  }

  getScopedAccessGrants (scope = this.getSelectedContainerScope()) {
    const grants = this.accessGrants ?? []
    if (!this.isContainer() || !this.subjectUri || this.protectedTarget) {
      return grants
    }
    return filterAuthorizationsByContainerScope(this.subjectUri, grants, scope, this.accessContext?.inherited ?? false)
  }

  refreshScopedAccessGrantDrafts () {
    const scopedAccessGrants = this.getScopedAccessGrants()
    this.accessGrantDrafts = createAccessGrantDrafts(scopedAccessGrants)
    this.authenticatedAccessRoleValue = getAuthenticatedAccessRole(scopedAccessGrants)
    this.publicAccessRoleValue = getPublicAccessRole(scopedAccessGrants)
  }

  selectContainerScope (scope) {
    this.containerScope = scope
    this.refreshScopedAccessGrantDrafts()
  }

  renderAdvancedSharing () {
    if (!this.advancedSharingOpen) return html``

    return html`
      <section
        id="access-control-advanced-sharing"
        class="access-control-advanced-sharing"
        role="group"
        aria-labelledby="access-control-advanced-sharing-heading"
        aria-describedby="access-control-advanced-sharing-description"
      >
        <h2 id="access-control-advanced-sharing-heading">Advanced sharing</h2>
        <p id="access-control-advanced-sharing-description">
          <span class="access-control-advanced-sharing-description-line">Use this option when the folder and its contents have different access requirements.</span>
          <span class="access-control-advanced-sharing-description-line">Choose which access settings to edit.</span>
          <span class="access-control-advanced-sharing-description-line">Save Changes applies your current edits only to that scope.</span>
        </p>
        ${this.isContainer()
          ? html`
            <button
              type="button"
              class="access-control-same-access-toggle"
              role="switch"
              aria-checked=${this.containerScope === 'folder+contents' ? 'true' : 'false'}
              @click=${() => {
                const checked = this.containerScope !== 'folder+contents'
                this.selectContainerScope(checked
                  ? 'folder+contents'
                  : this.containerScope === 'contents' ? 'contents' : 'folder')
              }}
            >
              <span class="access-control-switch-track" aria-hidden="true">
                <span class="access-control-switch-thumb"></span>
              </span>
              <span>Use the same access for this folder and its contents</span>
            </button>
            <div class="access-control-advanced-sharing-options">
              <solid-ui-button
                type="button"
                variant=${this.containerScope === 'folder' ? 'primary' : 'secondary'}
                aria-pressed=${this.containerScope === 'folder' ? 'true' : 'false'}
                @click=${() => { this.selectContainerScope('folder') }}
              >
                Folder Only
              </solid-ui-button>
              <solid-ui-button
                type="button"
                variant=${this.containerScope === 'contents' ? 'primary' : 'secondary'}
                aria-pressed=${this.containerScope === 'contents' ? 'true' : 'false'}
                @click=${() => { this.selectContainerScope('contents') }}
              >
                Contents Only
              </solid-ui-button>
            </div>
          `
          : html``}
        <div class="access-control-advanced-sharing-actions">
          <solid-ui-button
            type="button"
            variant="ghost"
            aria-label="Close advanced sharing"
            title="Close advanced sharing"
            @click=${this.closeAdvancedSharing}
          >
            <icon-lucide-x slot="icon" aria-hidden="true"></icon-lucide-x>
            <span class="sr-only">Close</span>
          </solid-ui-button>
        </div>
      </section>
    `
  }

  render () {
    const dialogTitle = this.getDialogTitle()

    return html`
      <solid-ui-dialog title=${dialogTitle}>
        <form @submit=${this.onSubmit}>
          <solid-ui-dialog-content>
            ${this.renderAccessContextState()}
            ${this.renderMixedContainerWarning()}
          <solid-ui-access-control-add-access
              .disabled=${!this.canMutate() || this.hasMixedContainerPolicy()}
              .principalInputValue=${this.principalInputValue}
              .addAccessRoleValue=${this.addAccessRoleValue}
              .pendingAccessGrants=${this.pendingAccessGrants}
              .inputError=${this.inputError}
              .asyncOptionsProvider=${accessPrincipalOptionsProvider}
              @target-input=${this.onPrincipalInput}
              @target-selected=${this.onPrincipalSelect}
              @role-changed=${this.onAddAccessRoleInput}
              @pending-grant-removed=${this.onPendingGrantRemoved}
            ></solid-ui-access-control-add-access>
            <solid-ui-access-control-shared-access
              .disabled=${!this.canMutate() || this.hasMixedContainerPolicy()}
              .accessGrantViewModels=${getAccessGrantViewModels(this.accessGrantDrafts)}
              @access-grant-role-changed=${this.onAccessGrantRoleInput}
            ></solid-ui-access-control-shared-access>
            <solid-ui-access-control-general-access
              .disabled=${!this.canMutate() || this.hasMixedContainerPolicy()}
              .subjectUri=${this.subjectUri}
              .authenticatedAccessRoleValue=${this.authenticatedAccessRoleValue}
              .publicAccessRoleValue=${this.publicAccessRoleValue}
              @authenticated-role-changed=${this.onAuthenticatedAccessRoleInput}
              @public-role-changed=${this.onPublicAccessRoleInput}
            ></solid-ui-access-control-general-access>
            <solid-ui-access-control-errors
              .errors=${this.saveErrors}
              .successfulChangesRefreshed=${this.successfulChangesRefreshed}
              @close=${this.onCancelClick}
            ></solid-ui-access-control-errors>
            ${this.renderSharingState()}
          </solid-ui-dialog-content>

          <solid-ui-dialog-footer>
            <div class="access-control-footer-actions">
              <solid-ui-button
                variant="secondary"
                @click=${this.onCancelClick}
              >
                Cancel
              </solid-ui-button>
              <solid-ui-button
                ?disabled=${!this.canMutate() || !this.hasUnsavedChanges() || this.submitting || this.saveErrors.length > 0 || this.hasMixedContainerPolicy()}
                ?loading=${this.submitting}
                type="button"
                @click=${this.onSaveClick}
              >
                Save Changes
              </solid-ui-button>
            </div>
          </solid-ui-dialog-footer>
        </form>
      </solid-ui-dialog>
    `
  }

  async onSubmit (e) {
    e.preventDefault()

    if (this.submitting || this.hasMixedContainerPolicy()) {
      return
    }

    if (this.isConnected && !await this.ensureAccessContext()) {
      return
    }

    await this.commitPrincipalFromInputSafely()
  }

  async onSaveClick () {
    if (this.submitting || this.hasMixedContainerPolicy()) {
      return
    }

    if (this.isConnected && !await this.ensureAccessContext()) {
      return
    }

    if (this.principalInputValue.trim()) {
      const committed = await this.commitPrincipalFromInputSafely()

      if (!committed) {
        return
      }
    }

    const scope = this.isContainer() && !this.protectedTarget
      ? this.getSelectedContainerScope()
      : 'file'
    await this.saveAccessChanges(scope === 'folder' ? 'container' : scope)
  }

  onCancelClick () {
    this.close()
  }

  closeAdvancedSharing () {
    this.advancedSharingOpen = false
  }

  async onResetToDefault () {
    if (!this.subjectUri || !this.canMutate() || !this.accessContext || this.accessContext.inherited || this.submitting || this.hasMixedContainerPolicy()) return

    this.submitting = true
    this.errors = this.errors.filter(error => error.action === 'input')
    try {
      await solidLogicSingleton.acl.resetToDefault(this.subjectUri)
      await this.loadAccessContext()
      const directAccessGrants = await solidLogicSingleton.acl.findAccessGrants(this.subjectUri)
      this.accessGrants = this.accessContext?.inherited
        ? this.accessContext.authorizations
        : directAccessGrants
    } catch (error) {
      this.errors = [...this.errors, {
        action: 'reset',
        targetUri: this.subjectUri,
        label: 'Custom sharing',
        message: error instanceof Error ? error.message : 'Unable to reset sharing.'
      }]
      debug.error('Failed to reset access control', error)
    } finally {
      this.submitting = false
    }
  }

  async saveAccessChanges (scope = 'file') {
    if (this.submitting || !this.canMutate() || this.hasMixedContainerPolicy()) {
      return
    }

    const changedAccessGrants = getChangedAccessGrants(this.accessGrantDrafts)
    const generalAccessChanges = this.getGeneralAccessChanges()

    if (!this.pendingAccessGrants.length && !changedAccessGrants.length && !generalAccessChanges.length) {
      return
    }

    if (!this.subjectUri) {
      return
    }

    this.submitting = true
    this.errors = this.errors.filter(error => error.action === 'input')
    this.successfulChangesRefreshed = true

    try {
      const accessChanges = buildAccessChanges({
        pendingAccessGrants: this.pendingAccessGrants,
        generalAccessChanges,
        changedAccessGrants
      })

      const saveErrors = await applyAccessChanges(this.subjectUri, accessChanges, {
        containerScope: scope
      })
      if (saveErrors.length) {
        this.errors = [...this.errors, ...saveErrors]
        this.principalInputValue = ''
        this.pendingAccessGrants = []

        try {
          this.accessGrants = await solidLogicSingleton.acl.findAccessGrants(this.subjectUri)
        } catch (error) {
          this.successfulChangesRefreshed = false
          this.errors = [
            ...this.errors,
            {
              action: 'save',
              targetUri: this.subjectUri,
              label: 'Shared with list',
              message: error instanceof Error
                ? error.message
                : 'Unable to refresh the access list.'
            }
          ]
          debug.error('Failed to refresh access grants after save errors', error)
        }

        debug.error('Failed to save some access changes', saveErrors)
        return
      }

      this.principalInputValue = ''
      this.pendingAccessGrants = []
      this.close()
    } catch (error) {
      this.errors = [
        ...this.errors,
        {
          action: 'save',
          targetUri: this.subjectUri ?? '',
          label: 'Access changes',
          message: error instanceof Error
            ? error.message
            : 'Unexpected error while saving access changes.'
        }
      ]
    } finally {
      this.submitting = false
    }
  }

  onPrincipalInput (event) {
    if (!this.canMutate() || this.hasMixedContainerPolicy()) return
    this.principalInputValue = event.detail.value
    this.clearInputError()
  }

  onPrincipalSelect (event) {
    if (!this.canMutate() || this.hasMixedContainerPolicy()) return
    this.queuePendingPrincipal(event.detail.value, this.addAccessRoleValue, event.detail.label, undefined, event.detail.targetKind)
  }

  getGeneralAccessChanges () {
    if (!this.subjectUri) {
      return []
    }

    const accessGrants = this.getScopedAccessGrants()
    const currentAuthenticatedRole = getAuthenticatedAccessRole(accessGrants)
    const currentPublicRole = getPublicAccessRole(accessGrants)

    const authenticatedChange = this.authenticatedAccessRoleValue === currentAuthenticatedRole
      ? undefined
      : {
          subject: Authenticated,
          role: this.authenticatedAccessRoleValue,
          label: 'Authenticated users'
        }

    const publicChange = this.publicAccessRoleValue === currentPublicRole
      ? undefined
      : {
          subject: Public,
          role: this.publicAccessRoleValue,
          label: 'Public'
        }

    return [authenticatedChange, publicChange].filter(isDefined)
  }

  onAddAccessRoleInput (event) {
    if (!this.canMutate() || this.hasMixedContainerPolicy()) return
    this.addAccessRoleValue = event.detail.role
    this.pendingAccessGrants = this.pendingAccessGrants.map(grant => ({
      ...grant,
      role: event.detail.role
    }))
  }

  onAuthenticatedAccessRoleInput (event) {
    if (!this.canMutate() || this.hasMixedContainerPolicy()) return
    this.authenticatedAccessRoleValue = event.detail.role
  }

  onPublicAccessRoleInput (event) {
    if (!this.canMutate() || this.hasMixedContainerPolicy()) return
    this.publicAccessRoleValue = event.detail.role
  }

  onAccessGrantRoleInput (event) {
    if (!this.canMutate() || this.hasMixedContainerPolicy()) return
    this.accessGrantDrafts = this.accessGrantDrafts.map(draft =>
      draft.id === event.detail.id
        ? { ...draft, role: event.detail.role }
        : draft
    )
  }

  onPendingGrantRemoved (event) {
    if (!this.canMutate() || this.hasMixedContainerPolicy()) return
    this.pendingAccessGrants = this.pendingAccessGrants.filter((_, pendingIndex) => pendingIndex !== event.detail.index)
  }

  hasUnsavedChanges () {
    return Boolean(
      this.pendingAccessGrants.length ||
      this.principalInputValue.trim() ||
      getChangedAccessGrants(this.accessGrantDrafts).length ||
      this.getGeneralAccessChanges().length
    )
  }

  async commitPrincipalFromInput () {
    if (!this.canMutate() || this.hasMixedContainerPolicy()) {
      return false
    }

    const rawValue = this.principalInputValue.trim()
    if (!rawValue) {
      return false
    }

    return this.queuePendingPrincipal(rawValue, this.addAccessRoleValue, undefined, rawValue)
  }

  async commitPrincipalFromInputSafely () {
    const inputSnapshot = this.principalInputValue.trim()

    try {
      return await this.commitPrincipalFromInput()
    } catch (error) {
      if (this.principalInputValue.trim() !== inputSnapshot) {
        debug.error('Ignored stale access-target validation error', error)
        return false
      }

      this.setInputError({
        action: 'input',
        label: 'Access target',
        targetUri: this.principalInputValue.trim(),
        message: 'We could not verify this access target. Check the value and try again.'
      })
      debug.error('Failed to commit pending access grants', error)
      return false
    }
  }

  async queuePendingPrincipal (
    principal,
    role = this.addAccessRoleValue,
    preferredLabel,
    inputSnapshot,
    targetKind
  ) {
    const snapshot = inputSnapshot ?? this.principalInputValue.trim()
    const result = await this.createPendingAccessGrant(principal, role, preferredLabel, targetKind)

    if ('error' in result) {
      if (this.principalInputValue.trim() === snapshot) {
        this.setInputError(result.error)
      }
      debug.error('Failed to add access grant:', result.error.message)
      return false
    }

    const merged = [...this.pendingAccessGrants, result.grant]
    this.pendingAccessGrants = this.dedupePendingAccessGrants(merged)

    if (this.principalInputValue.trim() === snapshot) {
      this.clearInputError()
      this.principalInputValue = ''
    }

    return true
  }

  async createPendingAccessGrant (
    principal,
    role = this.addAccessRoleValue,
    preferredLabel,
    targetKind
  ) {
    try {
      const normalizedPrincipal = principal.trim()
      const resolvedTarget = await resolveAccessTarget(normalizedPrincipal, preferredLabel)
      if (!resolvedTarget) {
        return {
          error: {
            action: 'input',
            label: 'Access target',
            targetUri: normalizedPrincipal,
            message: 'Could not verify this access target'
          }
        }
      }

      return {
        grant: {
          subjectType: resolvedTarget.subjectType,
          subjectValue: resolvedTarget.subjectValue,
          role,
          label: resolvedTarget.label,
          targetKind: targetKind ?? resolvedTarget.targetKind
        }
      }
    } catch (error) {
      return {
        error: {
          action: 'input',
          label: 'Access target',
          targetUri: principal,
          message: error instanceof Error && error.message.trim()
            ? error.message
            : 'Could not verify this access target'
        }
      }
    }
  }

  dedupePendingAccessGrants (draftGrants) {
    const grantsBySubject = new Map()
    for (const draftGrant of draftGrants) {
      grantsBySubject.set(`${draftGrant.subjectType}:${draftGrant.subjectValue}`, draftGrant)
    }
    return [...grantsBySubject.values()]
  }
}

if (!customElements.get('solid-ui-access-control-modal')) customElements.define('solid-ui-access-control-modal', AccessControlModal)
