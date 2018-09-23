const chalk = require('chalk')
const { develop, build, serve, explore } = require('./lib')

module.exports = ({ context, program }) => {
  program
    .command('develop')
    .description('start development server')
    .option('-p, --port <port>', 'use specified port (default: 8080)')
    .option('-h, --host <host>', 'use specified host (default: 0.0.0.0)')
    .action(args => {
      wrapCommand(develop)(context, args)
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
    .action(args => {
      wrapCommand(explore)(context, args)
    })

  program
    .command('serve')
    .description('start a production node.js server')
    .option('-p, --port <port>', 'use specified port (default: 8080)')
    .option('-h, --host <host>', 'use specified host (default: 0.0.0.0)')
    .action(args => {
      wrapCommand(serve)(context, args)
    })
}

function wrapCommand (fn) {
  return (...args) => {
    return fn(...args).catch(err => {
      console.error(chalk.red(err.message))
      process.exitCode = 1
    })
  }
}
