import { join, resolve, dirname, relative, basename } from 'path'
import { isDirectory } from './utils/fs'
import { getState } from './utils/unix-move'
export class Project {
  root: string;

  src: string;

  source: string;

  target: string;

  sourceRoot: string;

  moverIsDir = false;

  constructor(root: string, source: string, target: string) {
    this.root = root
    this.src = join(root, 'src')
    this.source = source
    this.sourceRoot = this.source
    this.target = target
    this.moverIsDir = isDirectory(source)
    if (!this.moverIsDir) {
      this.sourceRoot = dirname(this.source)
    }
  }

  /**
   * 解析模块绝对路径
   * @param modulePath 模块引用路径
   * @param basePath 相对文件路径
   */
  parseAbsPath(modulePath: string, basePath: string) {
    if (modulePath.startsWith('@/')) {
      modulePath = modulePath.slice(2)
      return join(this.root, 'src', modulePath)
    }

    return resolve(dirname(basePath), modulePath)
  }

  isMover(filepath: string) {
    if (this.moverIsDir) {
      return filepath.startsWith(this.sourceRoot)
    }
    return this.source.startsWith(filepath)
  }

  relativeSrc(filepath: string) {
    return relative(this.src, filepath)
  }

  // 注意: 建立在提前预检的基础上

  /**
   * 获取 mover path
   * @param filepath
   */
  getMovePath(filepath: string) {
    const { source, target } = this
    const targetState = getState(target)
    const sourceTarget = join(target, basename(source))
    if (this.moverIsDir) {
      const relativeTarget = relative(source, filepath)
      // source is dir, target is not exist
      if (targetState === 0) return join(target, relativeTarget)
      // source is dir, target is dir, sourceTarget not exist
      return join(sourceTarget, relativeTarget)
    }

    // source is file, target is not exist/file
    if (targetState === 0 || targetState === 1) return this.target
    // source is file, target is dir, sourceTarget not exist/file
    return sourceTarget
  }
}
