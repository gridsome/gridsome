const path = require('path')
const validateQuery = require('../../graphql/utils/validateQuery')

module.exports = async function (source, map) {
  const { config, schema, graphql } = process.GRIDSOME
  const staticQueryPath = path.join(config.appPath, 'static-query')
  const callback = this.async()

  this.dependency(path.join(config.appPath, 'static-query', 'index.js'))

  // add dependency to now.js to re-run
  // this loader when store has changed
  if (process.env.NODE_ENV === 'development') {
    this.dependency(path.join(config.tmpDir, 'now.js'))
  }

  try {
    const errors = validateQuery(schema, source)

    if (errors && errors.length) {
      return callback(errors, source, map)
    }
  } catch (err) {
    return callback(err, source, map)
  }

  const { data } = await graphql(source)

  callback(null, `
    import initStaticQuery from ${JSON.stringify(staticQueryPath)}

    const data = ${JSON.stringify(data)}

    export default Component => {
      initStaticQuery(Component, data)
    }
  `, map)
}
