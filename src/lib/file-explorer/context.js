
import { createContext } from '@lit/context'
import { noopContext } from '../context/noopContext.js'

export const fileExplorerContext = createContext(Symbol('file-explorer'))
export const DEFAULT_FILE_EXPLORER_CONTEXT = noopContext('file-explorer')
