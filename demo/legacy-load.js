// Load with legacy.html. Imports every module converted by tools/convert.mjs
// on its own and reports which ones fail, into <pre id="load">.

const MODULES = [
  "acl/access-controller.js",
  "acl/access-groups.js",
  "acl/acl-control.js",
  "acl/acl.js",
  "acl/add-agent-buttons.js",
  "acl/index.js",
  "acl/types.js",
  "chat/bookmarks.js",
  "chat/chatLogic.js",
  "chat/dateFolder.js",
  "chat/infinite.js",
  "chat/keys.js",
  "chat/message.js",
  "chat/messageTools.js",
  "chat/signature.js",
  "chat/thread.js",
  "create/create.js",
  "create/index.js",
  "create/types.js",
  "footer/index.js",
  "header/empty-profile.js",
  "header/index.js",
  "icons/solid_logo.js",
  "icons/v2/icons-svg/contactIcons.js",
  "icons/v2/icons-svg/headerIcons.js",
  "icons/v2/icons-svg/pngIcons.js",
  "icons/v2/icons-svg/profileIcons.js",
  "lib/code-editor/CodeEditor.js",
  "lib/code-editor/index.js",
  "lib/debug.js",
  "lib/file-explorer/context.js",
  "lib/folders.js",
  "lib/iconBase.js",
  "lib/log.js",
  "lib/messageArea.js",
  "lib/newperson.js",
  "lib/noun_Camera_1618446_000000.js",
  "lib/pad.js",
  "lib/participation.js",
  "lib/preferences.js",
  "lib/styleConstants.js",
  "lib/style.js",
  "lib/style_multiSelect.js",
  "lib/table.js",
  "lib/tabs.js",
  "login/login.js",
  "matrix/index.js",
  "matrix/matrix.js",
  "matrix/types.js",
  "media/index.js",
  "media/media-capture.js",
  "signup/config-default.js",
  "signup/signup.js",
  "solid-ui.js",
  "utils/headerFooterHelpers.js",
  "utils/index.js",
  "utils/keyHelpers/accessData.js",
  "utils/keyHelpers/acl.js",
  "utils/keyHelpers/otherHelpers.js",
  "utils/label.js",
  "utils/objects.js",
  "v2/components/auth/loginButton/downArrow.js",
  "v2/components/auth/loginButton/index.js",
  "v2/components/auth/loginButton/LoginButton.js",
  "v2/components/auth/signupButton/index.js",
  "v2/components/auth/signupButton/SignupButton.js",
  "widgets/buttons/iconLinks.js",
  "widgets/buttons.js",
  "widgets/dragAndDrop.js",
  "widgets/error.js",
  "widgets/forms/autocomplete/autocompleteBar.js",
  "widgets/forms/autocomplete/autocompleteField.js",
  "widgets/forms/autocomplete/autocompletePicker.js",
  "widgets/forms/autocomplete/language.js",
  "widgets/forms/autocomplete/publicData.js",
  "widgets/forms/basic.js",
  "widgets/forms/comment.js",
  "widgets/forms/fieldFunction.js",
  "widgets/forms/fieldParams.js",
  "widgets/forms/formStyle.js",
  "widgets/forms.js",
  "widgets/index.js",
  "widgets/multiSelect.js",
  "widgets/peoplePicker.js",
  "widgets/widgetHelpers.js"
]

const out = document.getElementById('load')
let ok = 0

for (const mod of MODULES) {
  try {
    await import(`../src/${mod}`)
    ok++
  } catch (error) {
    out.textContent += `FAIL ${mod}: ${error.message}\n`
  }
}

// The package entry exports the same 45 names as upstream's dist/index.esm.js
const UPSTREAM = ["Account", "acl", "aclControl", "authContext", "CloseDialogEvent", "CodeEditor", "create", "createTypes", "customElement", "DEFAULT_AUTH_CONTEXT", "DEFAULT_DIALOG_CONTEXT", "DEFAULT_SIGNUP_URL", "Dialog", "DialogComponent", "dialogContext", "DialogTrait", "dom", "fileExplorerContext", "FormControlComponent", "FormControlTrait", "generateId", "icons", "infiniteMessageArea", "initFooter", "initHeader", "language", "log", "login", "matrix", "media", "messageArea", "NoopAuth", "ns", "pad", "participation", "preferences", "showDialog", "ShowDialogEvent", "SolidAuth", "style", "table", "tabs", "utils", "WebComponent", "widgets"]
const UI = await import('../src/solid-ui.js')
const missing = UPSTREAM.filter(name => UI[name] === undefined && name !== 'dom')

out.textContent += `solid-ui.js exports ${UPSTREAM.length - missing.length}/${UPSTREAM.length} of upstream's${missing.length ? ' (missing: ' + missing.join(', ') + ')' : ''}\n`
out.textContent += `loaded ${ok}/${MODULES.length}\nDONE\n`
