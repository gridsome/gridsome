const Airtable = require('airtable')
const { deprecate } = require('gridsome/lib/utils/deprecate')

class AirtableSource {
  constructor (api, options) {
    // renamed "baseId" config to "base"
    this.bases = []
    // options now contains an array of bases, each one with its tables
    for(const base of options.bases){
      let baseObject = new Airtable({ apiKey: options.apiKey }).base(base.id)
      baseObject.tables = base.tables
      this.bases.push(baseObject)
    }

    api.loadSource(async ({ addCollection, store }) => {
      this.store = store
      this.addCollection = addCollection
      // kept the tableName deprecation check, but I would suggest just removing it straight away.
      for(const base of options.bases){
        for(const table of base.tables){
          if (!!table.tableName && !table.name) {
            table.name = table.tableName
            delete table.tableName
            deprecate(`@gridsome/airtable-source: "tableName" option in config will be deprecated. Use "name" instead.)
          }
        }
      }
      await this.loadRecordsToCollections(options)
    })
  }

  loadRecordsToCollections = async function () {
    for(const base of this.bases){
      for (const table of base.tables) {
        const collection = this.addCollection({
          camelCasedFieldNames: true,
          typeName: table.typeName,
          route: table.route
        })
        await base(table.name)
          .select(table.select || {})
          .eachPage((records, fetchNextPage) => {
            records.forEach((record) => {
              this.addRecordToNode(record._rawJson, table, collection)
            })
            fetchNextPage()
          })
      }
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
