fe-mv
====

移动(重命名)目录或文件, 同时更新引用, 仅支持前端项目  

[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Version](https://img.shields.io/npm/v/fe-mv.svg)](https://npmjs.org/package/fe-mv)
[![Downloads/week](https://img.shields.io/npm/dw/fe-mv.svg)](https://npmjs.org/package/fe-mv)
[![License](https://img.shields.io/npm/l/fe-mv.svg)](https://github.com/MwumLi/fe-mv/blob/master/package.json)

<!-- toc -->
* [Usage](#usage)
* [Commands](#commands)
<!-- tocstop -->
# Usage

安装
```sh-session
$ npm install -g fe-mv
```

Help:  
```sh-session
$ fe-mv --help [COMMAND]
移动(重命名)目录或文件, 同时更新前端项目模块引用

USAGE
  $ fe-mv SOURCE TARGET

ARGUMENTS
  SOURCE  移动(重命名)的文件(目录)
  TARGET  目标位置

OPTIONS
  -h, --help       show CLI help
  -r, --root=root  项目根路径(默认自动探测 .git -> package.json -> cwd)
  -v, --version    show CLI version
```
