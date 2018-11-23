const { isEmpty } = require('lodash')
const inferTypes = require('../infer-types')
const { GraphQLObjectType } = require('../../graphql')

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
      fields: () => inferTypes([{ fields }], 'MetaData', nodeTypes)
    })
  }
}
