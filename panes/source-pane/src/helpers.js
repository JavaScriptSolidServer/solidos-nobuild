import { LiveStore, NamedNode, parse, serialize } from 'rdflib'
import { getStatusSection } from './StatusSection.js'
import { error } from './debug.js'

const parseable = {
  'text/n3': true,
  'text/turtle': true,
  'application/rdf+xml': true,
  'application/xhtml+xml': true, // For RDFa?
  'text/html': true, // For data island
  'application/json': true,
  'application/ld+json': true
}

export function happy (response, method) {
  if (!response.ok) {
    let msg = 'HTTP error on ' + method + '! Status: ' + response.status
    error(msg)
    if (response.status === 412) msg = 'Error: File changed by someone else'
    const { showError } = getStatusSection()
    showError(msg)
  }
  return response.ok
}

/** Set Caret position in a text box
* @param {Element} elem - the element to be tweaked
* @param {Integer} caretPos - the poisition starting at zero
* @credit  https://stackoverflow.com/questions/512528/set-keyboard-caret-position-in-html-textbox
*/
function setCaretPosition (elem, cause) {
  if (elem != null) {
    if (cause.characterInFile === -1 && cause.lineNo) cause.lineNo += 1
    const pos = cause.lineNo ? elem.value.split('\n', cause.lineNo).join('\n').length : 0
    const caretPos = pos + cause.characterInFile
    const textArea = elem
    if (textArea.createTextRange) {
      const range = textArea.createTextRange()
      range.move('character', caretPos)
      range.select()
    } else {
      elem.focus()
      if (elem.selectionStart) {
        elem.setSelectionRange(caretPos, caretPos)
      }
    }
  }
}

function HTMLDataIsland (data) {
  let dataIslandContentType = ''
  let dataIsland = ''
  const scripts = data.split('</script')
  if (scripts && scripts.length) {
    for (let script of scripts) {
      script = '<script' + script.split('<script')[1] + '</script>'
      const RDFType = ['text/turtle', 'text/n3', 'application/ld+json', 'application/rdf+xml']
      const contentType = RDFType.find(type => script.includes(`type="${type}"`))
      if (contentType) {
        dataIsland = script.replace(/^<script(.*?)>/gm, '').replace(/<\/script>$/gm, '')
        dataIslandContentType = contentType
        break
      }
    }
  }
  return [dataIsland, dataIslandContentType]
}

export function checkSyntax (store, subject, data, contentType, base) {
  const fetcher = store.fetcher
  const { showError, clearError } = getStatusSection()
  const textArea = document.querySelector('.sourcePaneTextArea')

  if (!showError || !clearError) return true
  if (!contentType || !parseable[contentType]) return true // don't check things we don't understand
  if (contentType === 'text/html') {
    [data, contentType] = HTMLDataIsland(data)
    if (!contentType) return true
  }
  try {
    clearError()
    if (contentType === 'application/json') {
      JSON.parse(data)
      return true
    } else {
      try {
        store.removeDocument(subject)
      } catch (err) {
        // this is a hack until issue is resolved in rdflib
        if (!(err instanceof Error) || !err.message.includes('Statement to be removed is not on store')) throw err
        error(err)
      }
      delete fetcher.requested[subject.value]
      // rdflib parse jsonld do not return parsing errors
      if (contentType === 'application/ld+json') {
        JSON.parse(data)
        parse(data, store, base.uri, contentType, (err, res) => {
          if (err) throw err
          const serialized = serialize(base, res, base.uri, contentType)
          if (typeof serialized === 'string' && data.includes('@id') && !serialized.includes('@id')) {
            const e = new Error('Invalid jsonld : predicate do not expand to an absolute IRI')
            showError(e.message)
            // throw e
            return false
          }
          return true
        })
      } else {
        parse(data, store, base.uri, contentType)
      }
    }
    return true
  } catch (e) {
    showError(e.message)
    let cause = e
    while (cause && cause.cause) {
      cause = cause.cause
      if (cause && cause.characterInFile) {
        setCaretPosition(textArea, cause)
      }
    }
    return false
  }
  return true
}

export function setControlVisible (button, visible) {
  if (!button) return
  button.classList.toggle('sourcePaneControlVisible', visible)
  button.classList.toggle('sourcePaneControlHidden', !visible)
}
