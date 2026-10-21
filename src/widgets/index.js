/**
 * General purpose utility functions used in the panes
 * oshani@csail.mit.edu
 *
 * Includes form-oriented widgets  timbl@w3.org
 *
 * sign-in sign-up widgets are in signin.js
 *
 *  Note... For pointers to posssible text-editing code, see
 *  http://stackoverflow.com/questions/6756407/what-contenteditable-editors
 */

// Each widget should ideally live in its own file.  In order to break up this
// monolithic widget index over time, we should add new widgets to the
// 'lib/widgets/' directory, and re-export them by merging the module namespaces:
//
// (In order to avoid name collisions, it is safely assumed that modules don't
// export widgets with the same name)

export * from './peoplePicker.js'
export * from './dragAndDrop.js'
export * from './buttons.js'
export * from './buttons/iconLinks.js'
export * from './error.js'
export * from './forms.js'

export * from './forms/autocomplete/autocompleteBar.js'
export * from './forms/autocomplete/autocompletePicker.js'

export * as publicData from './forms/autocomplete/publicData.js'

/*
import * as peoplePicker from './peoplePicker.js'
import * as dragAndDrop from './dragAndDrop.js'
import * as buttons from './buttons.js'
import * as error from './error.js'
import { forms } from './forms.js'

const widgets = Object.assign(
  {},
  buttons,
  peoplePicker,
  dragAndDrop,
  error,
  forms
)

// export default widgets .. Policy is not to use exports default
module.export = widgets // @@ Apparently no way to do this (yet?) in esm
console.log('widgets exported:', widgets)
*/
// ends
