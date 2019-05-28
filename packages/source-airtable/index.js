const Airtable = require('airtable')

module.exports = function (api, options) {
  const base = new Airtable({ apiKey: options.apiKey }).base(options.baseId)

  api.loadSource(async store => {
    const contentType = store.addContentType({
      camelCasedFieldNames: true,
      typeName: options.typeName,
      route: options.route
    })

    await base(options.tableName).select().eachPage((records, fetchNextPage) => {
      records.forEach((record) => {
        const item = record._rawJson
        contentType.addNode({
          id: item.id,
          ...item.fields
        })
      })
      fetchNextPage()
    })
  })
}
