const util = require('util')
const path = require('path')
const fs = require('fs-extra')
const { info, error } = require('@vue/cli-shared-utils')
const exec = util.promisify(require('child_process').exec)

const starters = ['default', 'wordpress']

module.exports = async (name, starter = 'default') => {
  const dir = path.resolve(process.cwd(), name)

  if (fs.existsSync(dir)) {
    return error(`Directory «${name}» already exists.`)
  }

  if (starters.includes(starter)) {
    starter = `gridsome/gridsome-starter-${starter}`
  }

  const url = `https://github.com/${starter}.git`

  await exec(`git clone ${url} ${dir} --single-branch`)
  await fs.remove(path.resolve(dir, '.git'))

  info(`Gridsome starter initialized in ./${name}`)
}
