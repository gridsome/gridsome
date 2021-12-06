const path = require('path')
const { rmSync, openSync } = require('fs')
const { spawnSync } = require('child_process')

const dirName = 'pnp-e2e'
const rootDir = path.resolve(__dirname, '..')
const projectDir = path.join(rootDir, dirName)
const projectOpts = { cwd: projectDir, stdio: 'inherit' }
const repo = 'https://github.com/gridsome/gridsome-starter-default.git'

const tasks = [
  function clone () {
    rmSync(projectDir, { recursive: true, force: true })
    spawnSync('git', ['clone', repo, dirName], { cwd: rootDir, stdio: 'inherit' })
  },
  function configure () {
    openSync(path.join(projectDir, 'yarn.lock'), 'w')
    spawnSync('yarn', ['set', 'version', 'berry'], projectOpts)
    spawnSync('yarn', ['config', 'set', 'pnpFallbackMode', 'none'], projectOpts)
    spawnSync('yarn', ['config', 'set', 'compressionLevel', 0], projectOpts)
  },
  function link () {
    spawnSync('yarn', ['link', '-A', rootDir], projectOpts)
  },
  function build () {
    spawnSync('yarn', ['build'], projectOpts)
  }
]

switch (process.argv.slice(2)[0]) {
  case 'clone': tasks[0](); break
  case 'configure': tasks[1](); break
  case 'link': tasks[2](); break
  case 'build': tasks[3](); break
  default: {
    for (const task of tasks) {
      task()
    }
  }
}
