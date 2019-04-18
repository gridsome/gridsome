const path = require('path')
const { snakeCase } = require('lodash')

function genPlugins (app, isServer) {
  const plugins = app.config.plugins
    .filter(entry => {
      return (
        entry.entries.clientEntry &&
        entry.server === isServer
      )
    }).map(entry => ({
      name: ['plugin', snakeCase(path.isAbsolute(entry.use)
        ? path.relative(app.context, entry.use) || 'project'
        : entry.use), entry.index].join('_'),
      entry: entry.entries.clientEntry,
      options: entry.clientOptions || entry.options
    }))

  let res = ''

  plugins.forEach(({ name, entry }) => {
    res += `import ${name} from ${JSON.stringify(entry)}\n`
  })

  res += `\nexport default [${plugins.map(({ name, options }) => {
    const props = []

    props.push(`    run: ${name}`)
    props.push(`    options: ${JSON.stringify(options)}`)

    return `\n  {\n${props.join(',\n')}\n  }`
  }).join(',')}\n]\n`

  return res
}

module.exports = genPlugins
