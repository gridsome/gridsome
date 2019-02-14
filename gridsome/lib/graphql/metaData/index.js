const { isEmpty } = require('lodash')
const { GraphQLObjectType } = require('graphql')
const { createFieldTypes } = require('../createFieldTypes')

module.exports = (store, nodeTypes) => {
  const fields = store.metaData.find().reduce((fields, obj) => {
    fields[obj.key] = obj.data
    return fields
  }, {})

  if (isEmpty(fields)) {
    return
  }

  return {
    resolve: () => fields,
    type: new GraphQLObjectType({
      name: 'MetaData',
      fields: () => createFieldTypes(fields, 'MetaData', nodeTypes)
    })
  }
}
