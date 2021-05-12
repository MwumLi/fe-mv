import * as fs from 'fs'
import { basename, join, relative, dirname } from 'path'
import { isDirectory, handleFileSync } from './utils/fs'
import { moduleRelativePath, moduleSrcPath, isNpmModule, isModuleSrcPath, toUnixPath } from './utils/path'
import { moveStat } from './utils/unix-move'
import { Project } from './project'

let project: Project

function generateReferencePathFor(filepath: string, referenceAbsPath: string) {
  const relativeSrc = project.relativeSrc(referenceAbsPath)
  const relativeTarget = relative(dirname(filepath), referenceAbsPath)
  const len = (v: string) => v.split('/').length
  if (len(relativeSrc) < len(relativeTarget)) {
    return moduleSrcPath(relativeSrc)
  }
  return moduleRelativePath(relativeTarget)
}

function generateMoverReferencePath(originModuleAbsPath: string, filepath: string) {
  const moveModuleAbsPath = project.getMovePath(originModuleAbsPath)
  return generateReferencePathFor(filepath, moveModuleAbsPath)
}

interface ReviseReferencePathHandler {
  (modulePath: string, filepath: string): string | null;
}

interface ReferenceStatementRecord {
  statement: string;
  newStatement: string;
}

function getReferenceStatementRecords(content: any, regReference: RegExp, handler: ReviseReferencePathHandler, filepath: any): ReferenceStatementRecord[] {
  const updated = []
  let matchResult
  while ((matchResult = regReference.exec(content))) {
    const { statement, modulePath } = matchResult.groups as {
      [key: string]: string;
    }
    if (isNpmModule(modulePath)) continue
    let newModulePath = handler(modulePath, filepath)
    if (newModulePath === null) continue
    newModulePath = toUnixPath(newModulePath)
    if (modulePath !== newModulePath) {
      const update = {
        statement,
        newStatement: statement.replace(modulePath, newModulePath),
      }
      updated.push(update)
    }
  }
  return updated
}

function updateReference(content: any, regReferences: any[], handler: ReviseReferencePathHandler, filepath: any) {
  const updates = regReferences
  .map((regReference: RegExp) => getReferenceStatementRecords(content, regReference, handler, filepath))
  .reduce((acc: any[], updated: any) => {
    return acc.concat(updated)
  }, [])
  if (!updates || updates.length === 0) return content
  const newContent = updates.reduce((content: string, { statement, newStatement }: any) => {
    return content.replace(statement, newStatement)
  }, content)
  return newContent
}

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
// TODO: 待添加类型sass less等
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

function generateRegReferences() {
  return [
    /(?<statement>(import|export)\s+.*from\s+['"](?<modulePath>.+)['"])/g, // import * from './example'
    // eslint-disable-next-line no-useless-escape
    /(?<statement>import\([^'"]*['"](?<modulePath>.+)['"][^\)]*\))/g, // import('./example')
    // eslint-disable-next-line no-useless-escape
    /(?<statement>(@import)\s+['"](?<modulePath>.+)['"])/g, // @import './example'
    // eslint-disable-next-line no-useless-escape
    /(?<statement>require\([^'"]*['"](?<modulePath>.+)['"][^\)]*\))/g, // require('./example')
  ]
}
/**
 * 更新被移动的文件(目录)的模块引用
 * @param filepath 待更新的文件路径
 */
function updateMoverReference(filepath: string) {
  handleFileSync(filepath, ({ content }) => {
    const regReferences = generateRegReferences()
    return updateReference(content, regReferences, (modulePath, filepath) => {
      // TODO: 优化: 可以选择更短的引入方式
      if (isModuleSrcPath(modulePath)) return null
      const originModuleAbsPath = project.parseAbsPath(modulePath, filepath)
      const curMoverMovePath = project.getMovePath(filepath)
      if (project.isMover(originModuleAbsPath)) {
        return generateMoverReferencePath(originModuleAbsPath, curMoverMovePath)
      }

      return generateReferencePathFor(curMoverMovePath, originModuleAbsPath)
    }, filepath)
  })
}

/**
 * 更新未移动的文件(目录)的模块引用
 * @param filepath 待更新的文件路径
 */
function updateNorMoverReference(filepath: string) {
  handleFileSync(filepath, ({ content }) => {
    const regReferences = generateRegReferences()
    return updateReference(content, regReferences, (modulePath, filepath) => {
      const originModuleAbsPath = project.parseAbsPath(modulePath, filepath)
      // 忽略非移动者的引用
      if (!project.isMover(originModuleAbsPath)) return null
      const newModulePath = generateMoverReferencePath(originModuleAbsPath, filepath)
      if (modulePath === newModulePath) return null
      return newModulePath
    }, filepath)
  })
}
export interface MoveOptions {
  root: string;
  sourceRoot?: string;
  sourceRootAlias?: string;
}

export function move(source: string, target: string, options: MoveOptions) {
  const { root } = options
  const { error, action } = moveStat(source, target)
  if (error) throw new Error(error)
  project = new Project(root, source, target)
  // 更新引用
  traversal(root, filepath => {
    const isMover = project.isMover(filepath)
    if (isMover) {
      updateMoverReference(filepath)
    } else {
      // 非移动者: 仅更新对移动者的引用
      updateNorMoverReference(filepath)
    }
  })
  // 移动(重命名)文件(目录)
  if (action) return action()
}
