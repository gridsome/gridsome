module.exports = ({ context, program }) => {
  program
    .command('develop')
    .description('start development server')
    .option('-p, --port <port>', 'use specified port (default: 8080)')
    .option('-h, --host <host>', 'use specified host (default: 0.0.0.0)')
    .action(args => {
      wrapCommand(require('./lib/develop'))(context, args)
    })

  program
    .command('build')
    .description('build site for production')
    .action(() => {
      wrapCommand(require('./lib/build'))(context, {})
    })

  program
    .command('explore')
    .description('explore GraphQL data')
    .option('-p, --port <port>', 'use specified port (default: 8080)')
    .option('-h, --host <host>', 'use specified host (default: 0.0.0.0)')
    .action(args => {
      wrapCommand(require('./lib/explore'))(context, args)
    })

  program
    .command('serve')
    .description('start a production node.js server')
    .option('-p, --port <port>', 'use specified port (default: 8080)')
    .option('-h, --host <host>', 'use specified host (default: 0.0.0.0)')
    .action(args => {
      wrapCommand(require('./lib/serve'))(context, args)
    })
}

function wrapCommand (fn) {
  const chalk = require('chalk')

  return (...args) => {
    return fn(...args).catch(err => {
      console.error(chalk.red(err.stack || err))
      process.exitCode = 1
    })
  }
}
