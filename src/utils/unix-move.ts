/* eslint-disable quote-props */
import * as rename from 'mv'
import { isDirectory } from './fs'
import { existsSync } from 'fs'
import { basename, join } from 'path'

interface ActionHandler {
  (): void | string;
}

interface StateToActions {
  [propName: string]: ActionHandler;
}

export function mv(source: string, target: string): string | void {
  const state1 = isDirectory(source) ? 1 : 0
  const state2 = isDirectory(target) ? 1 : 0
  const sourceTarget = join(target, basename(source))
  // 0 -> not exist 1 -> 不是目录 2 -> 文件
  const state3 = existsSync(sourceTarget) ? (isDirectory(sourceTarget) ? 2 : 1) : 0

  const renameWrapper = (target: string) => {
    return () => rename(source, target, { mkdirp: true }, (err: any) => {
      if (err) throw err
    })
  }

  const error = (sourceTarget: string, msg: string) => {
    return () => {
      return `rename ${source} to ${sourceTarget}: ${msg}`
    }
  }
  const state = `${state1}${state2}${state3}`
  const stateToActions: StateToActions = {
    // file -> file
    '000': renameWrapper(target),
    // file -> dir, dir/file is dir
    '012': error(sourceTarget, 'Is a directory'),
    // file -> dir, dir/file not exist
    '010': renameWrapper(sourceTarget),
    // file -> dir, dir/file not dir
    '011': renameWrapper(sourceTarget),
    // dir -> file
    '100': error(target, 'Not a directory'),
    // dir -> dir, dir/dir not exist
    '110': renameWrapper(sourceTarget),
    // dir -> dir, dir/dir exist, is not dir
    '111': error(sourceTarget, 'Not a directory'),
    // dir -> dir, dir/dir is dir
    '112': error(sourceTarget, 'Directory not empty')
  }

  const action: ActionHandler = stateToActions[state]
  return action()
}
