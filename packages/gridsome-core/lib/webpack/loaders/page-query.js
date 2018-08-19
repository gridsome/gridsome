const path = require('path')
const validateQuery = require('../../graphql/utils/validateQuery')
const appPath = path.resolve(__dirname, '../../../app')

module.exports = function (source, map) {
  this.dependency(`${appPath}/page-query/index.js`)
  this.dependency(`${appPath}/page-query/dev.js`)

  const isDev = process.env.NODE_ENV === 'development'
  const { schema } = process.GRIDSOME_SERVICE
  const errors = validateQuery(schema, source)

  if (errors && errors.length) {
    return this.callback(errors, source, map)
  }

  this.callback(null, `
    import initPageQuery from '${appPath}/page-query'
    ${isDev && `import initDevQuery from '${appPath}/page-query/dev'`}

    const query = ${isDev ? JSON.stringify(source) : 'undefined'}

    export default Component => {
      initPageQuery(Component, query)
      ${isDev && 'initDevQuery(Component)'}
    }
  `, map)
}
