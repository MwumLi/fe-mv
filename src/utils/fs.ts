import { join, dirname } from 'path'
import { statSync, readFileSync, writeFileSync, existsSync } from 'fs'

export function isDirectory(filepath: string) {
  return statSync(filepath).isDirectory()
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

export function detectFile(file: string, cwd?: string) {
  cwd = cwd || process.cwd()
  const pkg = (dir: string) => join(dir, file)
  while (cwd !== '/') {
    if (existsSync(pkg(cwd))) return cwd
    cwd = dirname(cwd)
  }
  return null
}
