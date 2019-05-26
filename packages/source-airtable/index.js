const Airtable = require('airtable')

module.exports = function (api, options) {
  const base = new Airtable({ apiKey: options.apiKey }).base(options.base)

  api.loadSource(async store => {
    const contentType = store.addContentType({
      typeName: options.typeName,
      route: `/${options.route}/:id`
    })

    await base(options.table).select().eachPage((records, fetchNextPage) => {
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
