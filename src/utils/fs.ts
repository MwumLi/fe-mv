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

export function detectFile(filename: string, cwd?: string) {
  cwd = cwd || process.cwd()
  const filepath = (dir: string) => join(dir, filename)
  while (cwd !== '/') {
    if (existsSync(filepath(cwd))) return cwd
    cwd = dirname(cwd)
  }
  return null
}
