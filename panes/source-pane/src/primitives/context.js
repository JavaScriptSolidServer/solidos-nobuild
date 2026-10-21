import { createContext } from '@lit/context'
// (type-only import removed: EditorMetadata, SourcePaneState from '../types.js')

export const sourceContext = createContext(Symbol('source'))
