import {Command, flags} from '@oclif/command'
import { string } from '@oclif/command/lib/flags'
import {resolve} from 'path'
import {move} from './move'

class Move extends Command {
  static description = 'describe the command here'

  static flags = {
    // add --version flag to show CLI version
    version: flags.version({char: 'v'}),
    help: flags.help({char: 'h'}),
    // flag with no value (-r, --rootPath)
    rootPath: flags.string({
      char: 'r',
      description: '项目跟路径',
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
    const {args, flags} = this.parse(Move)
    const {source, target} = args
    const {rootPath = process.cwd()} = flags
    move(source, target, rootPath as string)
  }
}

export = Move
