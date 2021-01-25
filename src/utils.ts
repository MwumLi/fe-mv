import { statSync, readFileSync, writeFileSync } from 'fs'

export function isDirectory(filepath: string) {
  return statSync(filepath).isDirectory()
}

export function moduleSrcPath(filepath: string) {
  return `@/${filepath}`
}

export function moduleRelativePath(filepath: string) {
  if (['./', '../'].some(prefix => filepath.startsWith(prefix))) return filepath
  return `./${filepath}`
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
