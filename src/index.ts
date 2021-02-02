import { Command, flags } from '@oclif/command'
import { resolve } from 'path'
import { detectFile } from './utils/fs'
import { move } from './move'

class Move extends Command {
  static description = '移动(重命名)目录或文件, 同时更新前端项目模块引用'

  static flags = {
    // add --version flag to show CLI version
    version: flags.version({ char: 'v' }),
    help: flags.help({ char: 'h' }),
    // flag with no value (-r, --rootPath)
    root: flags.string({
      char: 'r',
      description: '项目根路径(默认自动探测 .git -> package.json -> cwd)',
      parse: v => resolve(v),
    }),
  }

  static args = [
    {
      name: 'source',
      required: true,
      description: '移动(重命名)的文件(目录)',
      parse: (v: string) => resolve(v),
    },
    {
      name: 'target',
      required: true,
      description: '目标位置',
      parse: (v: string) => resolve(v),
    },
  ]

  async run() {
    const { args, flags } = this.parse(Move)
    const { source, target } = args
    move(source, target, {
      root: this.getRootPath(flags.root)
    })
  }

  getRootPath(root?: string | null) {
    if (root) return root
    root = detectFile('.git')
    if (root) return root
    root = detectFile('package.json')
    if (root) return root
    return process.cwd()
  }
}

export = Move
