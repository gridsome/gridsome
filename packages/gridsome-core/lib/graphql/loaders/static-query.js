const path = require('path')
const validateQuery = require('../utils/validate-query')
const appPath = path.resolve(__dirname, '../../../app')

module.exports = async function (source, map) {
  this.dependency(`${appPath}/static-query/index.js`)

  const service = process.GRIDSOME_SERVICE
  const errors = validateQuery(service.schema, source)
  const callback = this.async()

  if (errors && errors.length) {
    return callback(errors, source, map)
  }

  const { data } = await service.graphql(source)

  callback(null, `
    import initStaticQuery from '${appPath}/static-query'

    const data = ${JSON.stringify(data)}

    export default Component => {
      initStaticQuery(Component, data)
    }
  `, map)
}
