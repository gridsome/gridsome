const chalk = require('chalk')
const config = require('../utils/configstore')

/**
 * @param {string | undefined} value
 * @param {import('commander').Command} cmd
 */
module.exports = async (value, cmd) => {
  if (cmd.json) {
    const path = config.path
    const json = JSON.stringify(config.all, null, 2)
    return console.log(`${path}\n${json}`)
  }

  if (cmd.set) {
    return config.set(cmd.set, value)
  }

  if (cmd.get) {
    if (config.has(cmd.get)) {
      return console.log(`${cmd.get}: ${chalk.bold(config.get(cmd.get))}`)
    } else {
      return console.log(`No option for ${chalk.bold(cmd.get)} found.`)
    }
  }

  if (cmd.delete) {
    if (config.has(cmd.delete)) {
      config.delete(cmd.delete)
      return console.log(`Deleted ${chalk.bold(cmd.delete)}`)
    } else {
      return console.log(`No option for ${chalk.bold(cmd.delete)} found.`)
    }
  }
}
