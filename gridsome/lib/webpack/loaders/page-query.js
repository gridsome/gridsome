const validateQuery = require('../../graphql/utils/validateQuery')

module.exports = function (source, map) {
  const isDev = process.env.NODE_ENV === 'development'
  const isServing = process.env.GRIDSOME_MODE === 'serve'
  const { schema, config } = process.GRIDSOME_SERVICE

  try {
    const errors = validateQuery(schema, source)

    if (errors && errors.length) {
      return this.callback(errors, source, map)
    }
  } catch (err) {
    return this.callback(err, source, map)
  }

  this.dependency(`${config.appPath}/page-query/index.js`)
  this.dependency(`${config.appPath}/page-query/dev.js`)

  this.callback(null, `
    import initPageQuery from '${config.appPath}/page-query'
    ${isDev && `import initDevQuery from '${config.appPath}/page-query/dev'`}

    const query = ${isServing ? JSON.stringify(source) : 'undefined'}

    export default Component => {
      initPageQuery(Component, query)
      ${isDev && 'initDevQuery(Component)'}
    }
  `, map)
}
