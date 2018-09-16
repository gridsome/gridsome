#!/usr/bin/env node

const path = require('path')
const chalk = require('chalk')
const fs = require('fs-extra')
const program = require('commander')
const resolveCwd = require('resolve-cwd')
const create = require('../lib/commands/create')
const pkgPath = require('find-up').sync('package.json')
const context = pkgPath ? path.dirname(pkgPath) : process.cwd()

// to know whether we are in the core repo or not
process.env.GRIDSOME_DEV = fs.existsSync('../../lerna.json')

program
  .version(require('../package').version)
  .usage('<command> [options]')

program
  .command('create <name> [starter]')
  .description('create a new website')
  .action((...args) => {
    return wrapCommand(create)(...args)
  })

try {
  const gridsomePath = resolveCwd.silent('gridsome')

  if (gridsomePath) {
    // eslint-disable-next-line
    require(gridsomePath)({ context, program })
  }
} catch (err) {
  console.log(err)
}

// show a warning if the command does not exist
program.arguments('<command>').action((command) => {
  console.log(chalk.red(`Unknown command ${chalk.bold(command)}`))
})

program.on('--help', () => {
  console.log()
  console.log(`  Run ${chalk.cyan('gridsome <command> --help')} for detailed usage of given command.`)
  console.log()
})

program.parse(process.argv)

if (!process.argv.slice(2).length) {
  program.outputHelp()
}

function wrapCommand (fn) {
  return (...args) => {
    return fn(...args).catch(err => {
      console.error(chalk.red(err.stack))
      process.exitCode = 1
    })
  }
}
