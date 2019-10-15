const Airtable = require('airtable')

module.exports = function (api, options) {
  const base = new Airtable({ apiKey: options.apiKey }).base(options.baseId)

  api.loadSource(async actions => {
    const addCollection = actions.addCollection || actions.addContentType

    const collection = addCollection({
      camelCasedFieldNames: true,
      typeName: options.typeName,
      route: options.route
    })

    await base(options.tableName).select().eachPage((records, fetchNextPage) => {
      records.forEach((record) => {
        const item = record._rawJson
        collection.addNode({
          id: item.id,
          ...item.fields
        })
      })
      fetchNextPage()
    })
  })
}
