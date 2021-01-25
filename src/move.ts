import * as fs from 'fs'
import { basename, join, relative, dirname } from 'path'
import { isDirectory, moduleRelativePath, moduleSrcPath, handleFileSync, HandleFileSyncHandler } from './utils'
import { Project } from './project'

let project: Project

function generateReferencePath(originModuleAbsPath: string, filepath: string) {
  const moveModuleAbsPath = project.getMovePath(originModuleAbsPath)
  const relativeSrc = project.relativeSrc(moveModuleAbsPath)
  const relativeTarget = relative(dirname(filepath), moveModuleAbsPath)
  const len = (v: string) => v.split('/').length
  if (len(relativeSrc) < len(relativeTarget)) {
    return moduleSrcPath(relativeSrc)
  }
  return moduleRelativePath(relativeTarget)
}

function updateNorMoverReference(filepath: string) {
  const handler: HandleFileSyncHandler = ({ content }): string => {
    const importReg = /(?<statement>(import|export)\s+.*from\s+['"](?<modulePath>.+)['"])/g
    let matchResult
    const updated = []
    while ((matchResult = importReg.exec(content))) {
      const { statement, modulePath } = matchResult.groups as {
        [key: string]: string;
      }
      const originModuleAbsPath = project.parseAbsPath(modulePath, filepath)
      // 忽略非移动者的引用
      if (!project.isMover(originModuleAbsPath)) continue

      const newModulePath = generateReferencePath(originModuleAbsPath, filepath)
      if (modulePath !== newModulePath) {
        const update = {
          statement,
          newStatement: statement.replace(modulePath, newModulePath),
        }
        updated.push(update)
      }
    }

    if (!updated || updated.length === 0) return content
    const newContent = updated.reduce((content, { statement, newStatement }) => {
      return content.replace(statement, newStatement)
    }, content)
    return newContent
  }
  handleFileSync(filepath, handler)
}

// function generateImportPath(filepath: any, rootPath: any, basePath: any) {
//   const relativeRootPath = path.relative(filepath, rootPath)
//   const relativeBasePath = path.relative(filepath, basePath)
// }

const filterFunc = (filter: string | RegExp, name: string) => {
  if (filter instanceof RegExp) return filter.test(name)
  return filter === name
}

/**
 * 判断文件是否需要忽略
 * @param filename 文件名
 * @param ignoreList
 */
function canIgnore(filename: string, ignoreList: (string | RegExp)[]): boolean {
  filename = basename(filename)
  return ignoreList.some(v => filterFunc(v, filename))
}

function canVisit(filename: string, visitList: (string | RegExp)[]): boolean {
  if (!visitList || visitList.length === 0) return false
  filename = basename(filename)
  return visitList.some(v => filterFunc(v, filename))
}

const IGNORE_LIST = ['node_modules', /^\..+/, 'README.md']
const ALLOW_LIST = [/.(js|vue|ts)$/]
function traversal(dir: string, callback: (arg0: any) => void) {
  fs.readdirSync(dir).forEach((file: string) => {
    if (canIgnore(file, IGNORE_LIST)) return
    const pathname = join(dir, file)
    if (isDirectory(pathname)) {
      traversal(pathname, callback)
    } else if (canVisit(file, ALLOW_LIST)) {
      callback(pathname)
    }
  })
}

export function move(source: string, target: string, rootPath: string): void {
  project = new Project(rootPath, source, target)
  traversal(rootPath, filepath => {
    const isMover = project.isMover(filepath)
    if (isMover) {
      console.log('TODO - ', filepath)
      // process.exit(0)
    } else {
      // 非移动者: 仅更新对移动者的引用
      updateNorMoverReference(filepath)
    }
  })
}
