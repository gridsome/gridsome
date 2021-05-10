const Airtable = require('airtable')
const { deprecate } = require('gridsome/lib/utils/deprecate')

class AirtableSource {
  constructor (api, options) {
    // renamed "baseId" config to "base"
    options.base = options.base || options.baseId
    this.base = new Airtable({ apiKey: options.apiKey }).base(options.base)

    api.loadSource(async ({ addCollection, store }) => {
      this.store = store
      this.addCollection = addCollection
      // to avoid breaking changes when someone is using old config options
      // convert to new format and show deprecation warning
      if (!!options.tableName && !options.tables) {
        options.tables = [
          {
            name: options.tableName,
            typeName: options.typeName
          }
        ]
        deprecate(`@gridsome/airtable-source: "tableName" option in config will be deprecated.
          You should switch to "tables" array config instead`)
      }
      await this.loadRecordsToCollections(options)
    })
  }

  loadRecordsToCollections = async function (options) {
    for (const table of options.tables) {
      const collection = this.addCollection({
        camelCasedFieldNames: true,
        typeName: table.typeName,
        route: table.route
      })
      await this.base(table.name)
        .select(table.select || {})
        .eachPage((records, fetchNextPage) => {
          records.forEach((record) => {
            this.addRecordToNode(record._rawJson, table, collection)
          })
          fetchNextPage()
        })
    }
  }

  addRecordToNode = function (item, table, collection) {
    if (table.links && table.links.length) {
      item = this.addLinkedRecords(item, table)
    }

    collection.addNode({
      id: item.id,
      ...item.fields
    })
  }

  addLinkedRecords = function (item, table) {
    table.links.forEach(link => {
      if (!item.fields[link.fieldName]) {
        return item
      }
      // when relation is set to "linkToFirst"
      // we just want the first id in the array
      // and return an object
      if (link.linkToFirst === true) {
        const id = item.fields[link.fieldName][0]
        item.fields[link.fieldName] = this.store.createReference(link.typeName, id)
        return item
      }
      // create reference for each id in the array that Airtable api returns
      item.fields[link.fieldName] = item.fields[link.fieldName].map(id => {
        return this.store.createReference(link.typeName, id)
      })
    })
    return item
  }
}
module.exports = AirtableSource
