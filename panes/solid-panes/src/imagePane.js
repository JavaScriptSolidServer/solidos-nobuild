import { importCss } from './importCss.js'
/*   Image Pane
 **
 **  This outline pane contains the document contents for an Image document
 */
import * as UI from 'solid-ui'

importCss(new URL('./imagePane.css', import.meta.url))

function contentTypeMatch (
  store,
  subject,
  contentTypes
) {
  const contentTypesForSubject = store.fetcher.getHeader(subject, 'content-type')
  if (!contentTypesForSubject) {
    return false
  }

  for (const contentType of contentTypesForSubject) {
    for (const candidate of contentTypes) {
      if (contentType.includes(candidate)) {
        return true
      }
    }
  }

  return false
}

export const imagePane = {
  icon: UI.icons.originalIconBase + 'tango/22-image-x-generic.png',

  name: 'image',

  label: function (subject, context) {
    const store = context.session.store
    if (
      !store.anyStatementMatching(
        subject,
        UI.ns.rdf('type'),
        store.sym('http://purl.org/dc/terms/Image')
      )
    ) {
      // NB: Not dc: namespace!
      return null
    }

    //   See also the source pane, which has lower precedence.

    const suppressed = ['application/pdf']
    if (contentTypeMatch(store, subject, suppressed)) {
      return null
    }
    return 'Image'
  },

  render: function (subject, context) {
    const myDocument = context.dom
    const store = context.session.store
    const div = myDocument.createElement('div')
    div.setAttribute('class', 'image-pane')
    const img = myDocument.createElement('img')

    // get image with authenticated fetch
    store.fetcher._fetch(subject.uri)
      .then(function (response) {
        return response.blob()
      })
      .then(function (myBlob) {
        const objectURL = URL.createObjectURL(myBlob)
        img.setAttribute('src', objectURL) // w640 h480 //
      })
    img.classList.add('image-pane__image')
    div.appendChild(img)
    return div
  }
}

// ends
