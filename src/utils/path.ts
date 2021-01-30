const MODULE_SRC_PREFIX = '@/'
export function isModuleSrcPath(filepath: string) {
  return filepath.startsWith(MODULE_SRC_PREFIX)
}

/**
 * 当 modFilepath 是相对于 src 路径实收，给它加上 source root alias
 * @param modFilepath 使用 / 分割的路径
 */
export function moduleSrcPath(modFilepath: string) {
  return `${MODULE_SRC_PREFIX}${modFilepath}`
}

function isModuleRelativePath(filepath: string) {
  return ['./', '../'].some(prefix => filepath.startsWith(prefix))
}

export function toUnixPath(path: string) {
  return path
  .replace(/^(.+):\\/, '/$1/') // windows 下 C:// => /C/
  .replace(/\\/g, '/')  // windows 下 a\b\c => a/b/c
}

export function moduleRelativePath(filepath: string) {
  filepath = toUnixPath(filepath)
  if (isModuleRelativePath(filepath)) return filepath
  return `./${filepath}`
}

export function isNpmModule(modulePath: string) {
  return !(isModuleRelativePath(modulePath) || isModuleSrcPath(modulePath))
}
