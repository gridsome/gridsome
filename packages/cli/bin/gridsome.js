#!/usr/bin/env node

const path = require('path')
const chalk = require('chalk')
const program = require('commander')
const didYouMean = require('didyoumean')
const resolveCwd = require('resolve-cwd')
const resolveVersions = require('../lib/utils/version')
const pkgPath = require('find-up').sync('package.json')

const context = pkgPath ? path.dirname(pkgPath) : process.cwd()
const version = resolveVersions(pkgPath)

function suggestCommands (cmd) {
  const availableCommands = program.commands.map(cmd => {
    return cmd._name
  })

  const suggestion = didYouMean(cmd, availableCommands)
  if (suggestion) {
    console.log()
    console.log(`Did you mean ${suggestion}?`)
  }
}

program
  .version(version, '-v, --version')
  .usage('<command> [options]')

program
  .command('create <name> [starter]')
  .description('create a new website')
  .action((...args) => {
    const create = require('../lib/commands/create')
    return wrapCommand(create)(...args)
  })

try {
  const gridsomePath = resolveCwd.silent('gridsome')

  if (gridsomePath) {
    require(gridsomePath)({ context, program })
  }
} catch (err) {
  console.log(err)
}

// show a warning if the command does not exist
program.arguments('<command>').action(async command => {
  const { isGridsomeProject, hasYarn } = require('../lib/utils')

  if (isGridsomeProject(pkgPath)) {
    const useYarn = await hasYarn()

    console.log()
    console.log(`  Please run ${chalk.cyan(useYarn ? 'yarn' : 'npm install')} to install dependencies first.`)
    console.log()
  } else {
    console.log(chalk.red(`Unknown command ${chalk.bold(command)}`))
    suggestCommands(command)
  }
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
