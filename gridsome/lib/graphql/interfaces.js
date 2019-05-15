const { schemaComposer } = require('graphql-compose')

const nodeInterface = schemaComposer.createInterfaceTC({
  name: 'Node',
  fields: {
    id: 'ID!'
  }
})

module.exports = {
  nodeInterface
}
