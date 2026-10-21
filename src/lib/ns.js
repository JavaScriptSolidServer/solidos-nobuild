// Namespaces we commonly use and have common prefixes for around Solid.
// The importmap points `rdflib` at the same URL solid-logic loads, so this is
// the one rdflib instance the store uses.
import solidNamespace from 'solid-namespace'
import * as $rdf from 'rdflib'

export default solidNamespace($rdf)
