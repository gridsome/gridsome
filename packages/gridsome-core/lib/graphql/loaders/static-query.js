const path = require('path')
const { parse } = require('../graphql')
const validateQuery = require('../utils/validateQuery')
const appPath = path.resolve(__dirname, '../../../app')

module.exports = async function (source, map) {
  this.dependency(`${appPath}/static-query/index.js`)

  const service = process.GRIDSOME_SERVICE
  const errors = validateQuery(service.schema, source)
  const callback = this.async()

  if (errors && errors.length) {
    return callback(errors, source, map)
  }

  const document = parse(source)
  const { data } = await service.graphql(document)

  callback(null, `
    import initStaticQuery from '${appPath}/static-query'

    const data = ${JSON.stringify(data)}

    export default Component => {
      initStaticQuery(Component, data)
    }
  `, map)
}
