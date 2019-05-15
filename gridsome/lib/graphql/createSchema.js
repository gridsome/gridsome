const { SchemaComposer } = require('graphql-compose')
const initSharedTypes = require('./types')

module.exports = store => {
  const schemaComposer = new SchemaComposer()

  initSharedTypes(schemaComposer).forEach(typeDef => {
    schemaComposer.addSchemaMustHaveType(typeDef)
  })

  const directives = require('./directives')
  const pagesSchema = require('./pages')(schemaComposer)
  const nodesSchema = require('./nodes')(schemaComposer, store)
  const metaData = require('./metaData')(schemaComposer, store)

  schemaComposer.Query.addFields(metaData)
  schemaComposer.Query.addFields(nodesSchema)
  schemaComposer.Query.addFields(pagesSchema)

  for (const directive of directives) {
    schemaComposer.addDirective(directive)
  }

  return schemaComposer.buildSchema()
}
