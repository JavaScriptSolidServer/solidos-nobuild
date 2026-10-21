import { NamedNode, Statement, sym } from 'rdflib'
import { ns } from 'solid-ui'
import { store } from 'solid-logic'
import { generateRandomString, getStatementsToAdd, getStatementsToDelete } from './trustedApplications.utils.js'

export function createApplicationTable (subject) {
  const applicationsTable = createElement('table', {
    class: 'results'
  })

  // creating headers
  const header = createContainer('tr', [
    createText('th', 'Application URL'),
    createText('th', 'Access modes'),
    createText('th', 'Actions')
  ])
  applicationsTable.appendChild(header);

  // creating rows
  (store.each(subject, ns.acl('trustedApp'), undefined, undefined))
    .flatMap(app => store
      .each(app, ns.acl('origin'), undefined, undefined)
      .map(origin => ({
        appModes: store.each(app, ns.acl('mode'), undefined, undefined),
        origin: origin
      })))
    .sort((a, b) => (a.origin.value < b.origin.value ? -1 : 1))
    .forEach(
      ({ appModes, origin }) =>
        applicationsTable.appendChild(
          createApplicationEntry(subject, origin, appModes, updateTable)
        )
    )

  // adding a row for new applications
  applicationsTable.appendChild(
    createApplicationEntry(subject, null, [ns.acl('Read')], updateTable)
  )

  return applicationsTable

  function updateTable () {
    applicationsTable.parentElement.replaceChild(
      createApplicationTable(subject),
      applicationsTable
    )
  }
}

function createApplicationEntry (
  subject,
  origin,
  appModes,
  updateTable
) {
  const trustedApplicationState = {
    origin,
    appModes,
    formElements: {
      modes: [],
      origin: undefined
    }
  }
  return createContainer('tr', [
    createContainer('td', [
      createContainer(
        'form',
        [
          createElement(
            'input',
            {
              class: 'textinput',
              placeholder: 'Write new URL here',
              value: origin ? origin.value : ''
            },
            {},
            element => {
              trustedApplicationState.formElements.origin = element
            }
          )
        ],
        {},
        {
          submit: addOrEditApplication
        }
      )
    ]),
    createContainer('td', [
      createContainer(
        'form',
        createModesInput(trustedApplicationState),
        {},
        {
          submit: addOrEditApplication
        }
      )
    ]),
    createContainer('td', [
      createContainer(
        'form',
        origin
          ? [
              createText('button', 'Update', {
                class: 'controlButton',
                style: 'background: LightGreen;'
              }),
              createText(
                'button',
                'Delete',
                {
                  class: 'controlButton',
                  style: 'background: LightCoral;'
                },
                {
                  click: removeApplication
                }
              )
            ]
          : [
              createText('button', 'Add', {
                class: 'controlButton',
                style: 'background: LightGreen;'
              })
            ],
        {},
        {
          submit: addOrEditApplication
        }
      )
    ])
  ])

  function addOrEditApplication (event) {
    event.preventDefault()
    let origin
    try {
      origin = sym(trustedApplicationState.formElements.origin.value)
    } catch (err) {
      return alert('Please provide an application URL you want to trust')
    }

    const modes = trustedApplicationState.formElements.modes
      .filter(checkbox => checkbox.checked)
      .map(checkbox => checkbox.value)

    const deletions = getStatementsToDelete(
      trustedApplicationState.origin || origin,
      subject,
      store,
      ns
    )
    const additions = getStatementsToAdd(
      origin,
      generateRandomString(),
      modes,
      subject,
      ns
    )
    if (!store.updater) {
      throw new Error('Store has no updater')
    }
    store.updater.update(deletions, additions, handleUpdateResponse)
  }

  function removeApplication (event) {
    event.preventDefault()
    let origin
    try {
      origin = sym(trustedApplicationState.formElements.origin.value)
    } catch (err) {
      return alert(
        'Please provide an application URL you want to remove trust from'
      )
    }

    const deletions = getStatementsToDelete(origin, subject, store, ns)
    if (!store.updater) {
      throw new Error('Store has no updater')
    }
    store.updater.update(deletions, [], handleUpdateResponse)
  }

  function handleUpdateResponse (uri, success, errorBody) {
    if (success) {
      return updateTable()
    }
    // console.error(uri, errorBody)
  }
}

function createElement (
  elementName,
  attributes = {},
  eventListeners = {},

  onCreated = null
) {
  const element = document.createElement(elementName)
  if (onCreated) {
    onCreated(element)
  }
  Object.keys(attributes).forEach(attName => {
    element.setAttribute(attName, attributes[attName])
  })
  Object.keys(eventListeners).forEach(eventName => {
    element.addEventListener(eventName, eventListeners[eventName])
  })
  return element
}

export function createContainer (
  elementName,
  children,
  attributes = {},
  eventListeners = {},
  onCreated = null
) {
  const element = createElement(
    elementName,
    attributes,
    eventListeners,
    onCreated
  )
  children.forEach(child => element.appendChild(child))
  return element
}

export function createText (
  elementName,
  textContent,
  attributes = {},
  eventListeners = {},
  onCreated = null
) {
  const element = createElement(
    elementName,
    attributes,
    eventListeners,
    onCreated
  )
  element.textContent = textContent
  return element
}

function createModesInput ({ appModes, formElements }) {
  return ['Read', 'Write', 'Append', 'Control'].map(mode => {
    const isChecked = appModes.some(
      appMode => appMode.value === ns.acl(mode).value
    )
    return createContainer('label', [
      createElement(
        'input',
        {
          type: 'checkbox',
          ...(isChecked ? { checked: '' } : {}),
          value: ns.acl(mode).uri
        },
        {},
        element => formElements.modes.push(element)
      ),
      createText('span', mode)
    ])
  })
}
