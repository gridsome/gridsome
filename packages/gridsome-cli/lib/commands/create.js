const ora = require('ora')
const path = require('path')
const fs = require('fs-extra')
const execa = require('execa')
const chalk = require('chalk')
const { error } = require('@vue/cli-shared-utils')

module.exports = async (name, starter = 'default') => {
  const dir = path.resolve(process.cwd(), name)
  const starters = ['default', 'wordpress']

  if (fs.existsSync(dir)) {
    return error(`Directory «${name}» already exists.`)
  }

  if (starters.includes(starter)) {
    starter = `gridsome/gridsome-starter-${starter}`
  }

  const url = `https://github.com/${starter}.git`
  const spinner = ora(`Downloading starter from ${url}`).start()

  await exec('git', ['clone', url, dir, '--single-branch'])
  await fs.remove(path.resolve(dir, '.git'))

  const hasYarn = useYarn()
  const developCommand = 'gridsome develop'
  const buildCommand = 'gridsome build'

  spinner.text = 'Installing dependencies...'

  try {
    if (hasYarn) await exec('yarnpkg')
    else await exec('npm', ['install'])

    spinner.succeed('Project created successfully!')
  } catch (e) {
    spinner.fail('Failed to install dependencies')
  }

  console.log()
  console.log(`    - Enter directory ${chalk.cyan(`cd ${name}`)}`)
  console.log(`    - Run ${chalk.cyan(developCommand)} to start local development`)
  console.log(`    - Run ${chalk.cyan(buildCommand)} to build for production`)
  console.log()
}

function useYarn () {
  try {
    shellSync('yarnpkg', ['--version'])
    return true
  } catch (e) {
    return false
  }
}

function exec (cmd, args = [], options = { stdio: 'ignore' }) {
  return execa(cmd, args, options)
}

function shellSync (cmd, args = [], options = { stdio: 'ignore' }) {
  return execa.shellSync(cmd, args, options)
}
