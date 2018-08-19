const path = require('path')
const chalk = require('chalk')
const { develop, build, explore } = require('./lib')

module.exports = ({ context, program }) => {
  program
    .command('develop')
    .description('start development server')
    .option('-p, --port <port>', 'use specified port (default: 8080)')
    .option('-h, --host <host>', 'use specified host (default: 0.0.0.0)')
    .action(({ host, port }) => {
      wrapCommand(develop)(context, { host, port })
    })

  program
    .command('build')
    .description('build site for production')
    .action(() => {
      wrapCommand(build)(context, {})
    })

  program
    .command('explore')
    .description('explore GraphQL data')
    .option('-p, --port <port>', 'use specified port (default: 8080)')
    .option('-h, --host <host>', 'use specified host (default: 0.0.0.0)')
    .action(({ host, port }) => {
      wrapCommand(explore)(context, { host, port })
    })
}

module.exports.Plugin = require('./lib/Plugin')
module.exports.Source = require('./lib/Source')
module.exports.Transformer = require('./lib/Transformer')

function wrapCommand (fn) {
  return (...args) => {
    return fn(...args).catch(err => {
      console.error(chalk.red(err.stack))
      process.exitCode = 1
    })
  }
}
