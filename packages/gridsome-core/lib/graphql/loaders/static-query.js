const path = require('path')
const { parse } = require('../graphql')
const validateQuery = require('../utils/validateQuery')
const appPath = path.resolve(__dirname, '../../../app')

module.exports = async function (source, map) {
  const { config, schema, graphql } = process.GRIDSOME_SERVICE
  const errors = validateQuery(schema, source)
  const callback = this.async()

  this.dependency(`${appPath}/static-query/index.js`)

  // add dependency to now.js to re-run
  // this loader when store has changed
  if (process.env.NODE_ENV === 'development') {
    this.dependency(`${config.tmpDir}/now.js`)
  }

  if (errors && errors.length) {
    return callback(errors, source, map)
  }

  const doc = parse(source)
  const { data } = await graphql(doc)

  callback(null, `
    import initStaticQuery from '${appPath}/static-query'

    const data = ${JSON.stringify(data)}

    export default Component => {
      initStaticQuery(Component, data)
    }
  `, map)
}
