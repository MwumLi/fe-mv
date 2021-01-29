import { join, resolve, dirname, relative, basename } from 'path'
import { isDirectory } from './utils/fs'
type KEYS = 'sourceRoot' | 'targetRoot'
export class Project {
  root: string;

  src: string;

  source: string;

  target: string;

  targetRoot: string;

  sourceRoot: string;

  moverIsDir = false;

  constructor(root: string, source: string, target: string) {
    this.root = root
    this.src = join(root, 'src')
    this.source = source
    this.sourceRoot = this.source
    this.target = target
    this.targetRoot = this.source
    const moverIsDir = isDirectory(source)
    if (!moverIsDir) {
      (['sourceRoot', 'targetRoot'] as KEYS[]).forEach(key => {
        this[key] = dirname(this[key])
      })
      this.sourceRoot = dirname(this.source)
    }

    this.moverIsDir = moverIsDir
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

  startsWithSource(filepath: string) {
    return filepath.startsWith(this.sourceRoot)
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

  relativeTarget(filepath: string) {
    return relative(this.target, filepath)
  }

  getMovePath(filepath: string) {
    // TODO: 假如 mover 不是目录, 则 target 保持 filepath 同样的后缀
    if (!this.moverIsDir) return this.target
    const relativeTarget = relative(this.source, filepath)
    if(isDirectory(this.source)){
      const moveDir = basename(this.source)
      return join(this.target, moveDir,  relativeTarget)
    }
    return join(this.target, relativeTarget)
  }
}
