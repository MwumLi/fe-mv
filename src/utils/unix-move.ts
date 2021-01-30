/* eslint-disable quote-props */
import * as rename from 'mv'
import { isDirectory } from './fs'
import { existsSync } from 'fs'
import { basename, join } from 'path'

export interface MoveActionHandler {
  (): void;
}

interface StateActionInfo {
  state?: string;
  states?: string[];
  error?: string;
  action?: MoveActionHandler
}

interface MoveStats {
  state: string;
  error?: string;
  action?: MoveActionHandler
}

const STATE_NOT_EXIST = 0
const STATE_IS_NOT_DIR = 1
const STATE_IS_DIR = 2

function getState(filepath: string) {
  const exist = existsSync(filepath)
  if (!exist) return STATE_NOT_EXIST
  const isDir = isDirectory(filepath)
  return isDir ? STATE_IS_DIR : STATE_IS_NOT_DIR
}

export function moveStat(source: string, target: string): MoveStats {
  const renameWrapper = (target: string) => {
    return () => rename(source, target, { mkdirp: true }, (err: any) => {
      if (err) throw err
    })
  }

  const sourceTarget = join(target, basename(source))
  const state = [source, target, sourceTarget].map(getState).join('')
  const stateToErrors = [
    {
      state: '0', // if source not exist
      error: `cannot stat '${source}': No such file or directory`
    },
    {
      state: '122', // if source is file, target is dir and sourceTarget is dir
      error: `cannot overwrite directory '${sourceTarget}' with non-directory`
    },
    {
      state: '21', // if source is dir, target is file
      error: `cannot overwrite non-directory '${target}' with directory '${source}'`
    },
    {
      state: '221', // if source is dir, target is dir and sourceTarget is file
      error: `cannot overwrite non-directory '${sourceTarget}' with directory '${source}'`
    },
    { // TODO: if sourceTarget is empty, will overwrite sourceTarget
      state: '222', // if source is dir, target is dir and sourceTarget is dir
      error: `cannot move '${source}' to '${sourceTarget}': Directory exists`
    }
  ]

  const stateToActions = [
    {
      states: ['10', '11', '20'], // file -> not exist/file, dir -> not exist
      action: renameWrapper(target)
    },
    {
      states: ['120', '121', '220'], // file -> dir/file not exist/file, dir -> dir/dir not exist
      action: renameWrapper(sourceTarget)
    }
  ]

  const matchState = (state: string, eState: string) => [...eState].every((c, i) => c === 'x' || c === state[i])
  const matchErrorOrAction = (state: string, item: StateActionInfo) => {
    let states = item.states || [item.state as string]
    return states.some(eState => matchState(state, eState))
  }

  const stateActions: StateActionInfo[] = [
    ...stateToErrors,
    ...stateToActions
  ]
  const { error, action } = stateActions.find(item => matchErrorOrAction(state, item)) || {}
  return {
    state,
    error,
    action
  }
}
