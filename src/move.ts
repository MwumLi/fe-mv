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

function updateNorMoverReference(filepath: string) {
  handleFileSync(filepath, ({ content }) => {
    const regReferences = [
      /(?<statement>(import|export)\s+.*from\s+['"](?<modulePath>.+)['"])/g
    ]
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

function updateMoverReference(filepath: string) {
  handleFileSync(filepath, ({ content }) => {
    const regReferences = [
      /(?<statement>(import|export)\s+.*from\s+['"](?<modulePath>.+)['"])/g
    ]
    return updateReference(content, regReferences, (modulePath, filepath) => {
      if (isNpmModule(modulePath)) return null
      // TODO: 优化: 可以选择更短的引入方式
      if (isModuleSrcPath(modulePath)) return null
      const originModuleAbsPath = project.parseAbsPath(modulePath, filepath)
      // console.log(originModuleAbsPath)
      const curMoverMovePath = project.getMovePath(filepath)
      if (project.isMover(originModuleAbsPath)) {
        return generateMoverReferencePath(originModuleAbsPath, curMoverMovePath)
      }

      return generateReferencePathFor(filepath, originModuleAbsPath)
    }, filepath)
  })
}

export interface MoveOptions {
  root: string;
  sourceRoot?: string;
  sourceRootAlias?: string;
}

export function move(source: string, target: string, options: MoveOptions): void {
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
  action && action()
}
