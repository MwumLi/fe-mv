import { statSync, readFileSync, writeFileSync } from 'fs'

export function isDirectory(filepath: string) {
  return statSync(filepath).isDirectory()
}

const MODULE_SRC_PREFIX = '@/'
export function isModuleSrcPath(filepath: string) {
  return filepath.startsWith(MODULE_SRC_PREFIX)
}

export function moduleSrcPath(filepath: string) {
  return `${MODULE_SRC_PREFIX}${filepath}`
}

function isModuleRelativePath(filepath: string) {
  return ['./', '../'].some(prefix => filepath.startsWith(prefix))
}

export function moduleRelativePath(filepath: string) {
  if (isModuleRelativePath(filepath)) return filepath
  return `./${filepath}`
}

export function isNpmModule(modulePath: string) {
  return !(isModuleRelativePath(modulePath) || isModuleSrcPath(modulePath))
}

export type HandleFileSyncHandler = (options: { filepath: string; content: string }) => string
export function handleFileSync(filepath: string, handler: HandleFileSyncHandler) {
  const fsOptions = { encoding: 'utf-8' }
  const content = readFileSync(filepath, fsOptions)
  const newContent = handler({
    filepath,
    content
  })
  if (content === newContent) return
  writeFileSync(filepath, newContent, fsOptions)
}
