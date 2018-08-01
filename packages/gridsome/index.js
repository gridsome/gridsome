const fs = require('fs')
const path = require('path')
const Service = require('@vue/cli-service')

module.exports = ({ context, program }) => {
  program
    .command('develop')
    .description('start local development server')
    .action(() => {
      createService(context).run('gridsome:develop')
    })

  program
    .command('build')
    .description('build static files')
    .action(() => {
      createService(context).run('gridsome:build')
    })

  program
    .command('explore')
    .description('explore GraphQL data')
    .action(() => {
      createService(context).run('gridsome:explore')
    })
}

function createService (context) {
  return new Service(context, {
    inlineOptions: {
      lintOnSave: true
    },
    plugins: [
      plugin('gridsome/lib/plugins/babel'),
      plugin('@gridsome/core')
    ]
  })
}

function plugin (id) {
  return { id, apply: require(id) }
}
