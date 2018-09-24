// const { parse } = require('../../graphql/graphql')
const validateQuery = require('../../graphql/utils/validateQuery')

module.exports = async function (source, map) {
  const { config, schema, graphql } = process.GRIDSOME_SERVICE
  const callback = this.async()

  this.dependency(`${config.appPath}/static-query/index.js`)

  // add dependency to now.js to re-run
  // this loader when store has changed
  if (process.env.NODE_ENV === 'development') {
    this.dependency(`${config.tmpDir}/now.js`)
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
    import initStaticQuery from '${config.appPath}/static-query'

    const data = ${JSON.stringify(data)}

    export default Component => {
      initStaticQuery(Component, data)
    }
  `, map)
}
