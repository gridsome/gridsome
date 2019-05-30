const { createDateScalar } = require('./date')
const { createFileScalar } = require('./file')
const { createImageScalar, createImageFitEnum } = require('./image')

module.exports = schemaComposer => {
  const nodeInterface = schemaComposer.createInterfaceTC({
    name: 'Node',
    fields: {
      id: 'ID!'
    }
  })

  const nodeConnectionEdgeInterface = schemaComposer.createInterfaceTC({
    name: 'NodeConnectionEdge',
    fields: {
      node: 'Node',
      next: 'Node',
      previous: 'Node'
    }
  })

  const nodeConnectionInterface = schemaComposer.createInterfaceTC({
    name: 'NodeConnection',
    fields: () => ({
      totalCount: 'Int!',
      pageInfo: 'PageInfo!',
      edges: ['NodeConnectionEdge']
    })
  })

  const dateScalarType = createDateScalar(schemaComposer)
  const fileScalarType = createFileScalar(schemaComposer)
  const imageScalarType = createImageScalar(schemaComposer)
  const imageFitEnum = createImageFitEnum(schemaComposer)

  const pageInfoType = schemaComposer.createObjectTC({
    name: 'PageInfo',
    fields: {
      perPage: 'Int!',
      currentPage: 'Int!',
      totalPages: 'Int!',
      totalItems: 'Int!',
      hasPreviousPage: 'Boolean!',
      hasNextPage: 'Boolean!',
      isFirst: 'Boolean!',
      isLast: 'Boolean!'
    }
  })

  const sortOrderType = schemaComposer.createEnumTC({
    name: 'SortOrder',
    values: {
      ASC: {
        value: 'ASC',
        name: 'Ascending',
        description: 'Sort ascending'
      },
      DESC: {
        value: 'DESC',
        name: 'Descending',
        description: 'Sort descending'
      }
    }
  })

  const sortType = schemaComposer.createInputTC({
    name: 'SortArgument',
    fields: {
      by: {
        type: 'String!',
        defaultValue: 'date'
      },
      order: {
        type: 'SortOrder',
        defaultValue: 'DESC'
      }
    }
  })

  return [
    nodeInterface,
    nodeConnectionEdgeInterface,
    nodeConnectionInterface,
    dateScalarType,
    fileScalarType,
    imageScalarType,
    imageFitEnum,
    pageInfoType,
    sortOrderType,
    sortType
  ]
}
